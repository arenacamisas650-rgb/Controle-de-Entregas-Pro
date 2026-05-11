import { replaceState, snapshotState, state } from './state.js';
import { calcularGastoCombustivel, calcularLucro, formatarMoeda } from './calculations.js';
import { DB, loadSnapshot, migrateFromLocalStorage, persistSnapshot } from './storage.js';
import { validateConfig, validateImportPayload, validatePaymentKey, validateRoute, validateVale } from './validators.js';
import { queueSync, scheduleSync, syncNow } from './services/sync.js';
import { api } from './services/api.js';
import { auth } from './services/auth.js';
import { $, $$, clear, el, setText, showToast } from './ui/dom.js';
import { renderizarDashboard, renderizarGrafico } from './ui/dashboard.js';
import { renderizarHistorico } from './ui/historico.js';
import { renderizarModoTrabalhoAtivo, aplicarTemasColoresDinamicas } from './ui/trabalho-ativo.js';
import { trabalhoAtivoManager } from './realtime.js';

const ENABLE_AUTH = false; // MODO BYPASS PARA TESTES - ALTERAR PARA true EM PRODUÇÃO

const todayISO = () => new Date().toISOString().slice(0, 10);
const readInput = (id) => document.getElementById(id)?.value ?? '';
const writeInput = (id, value) => { const input = document.getElementById(id); if (input) input.value = value ?? ''; };
const persistConfig = () => DB.save('config', { id: 'app', ...state.config });
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

const updateSyncStatus = () => {
  state.sync.status = navigator.onLine ? 'online' : 'offline';
  const userLabel = state.auth.user?.email ? state.auth.user.email : 'sem login';
  setText('syncStatusText', `${state.sync.status === 'online' ? 'Online' : 'Offline'} - ${state.sync.pendentes.length} pendente(s) - ${userLabel}`);
  const dot = $('#headerStatus'); if (dot) dot.style.color = state.sync.status === 'online' ? cssVar('--green', '#16A34A') : cssVar('--yellow', '#F59E0B');
};

const setLoading = (loading, message = 'Carregando...') => {
  state.loading.data = loading;
  const overlay = $('#loadingOverlay');
  if (!overlay) return;
  overlay.classList.toggle('open', loading);
  setText('loadingText', message);
};

const updateAuthUI = () => {
  const authPanel = $('#authPanel');
  if (authPanel) authPanel.classList.toggle('open', ENABLE_AUTH && !state.auth.user);
  setText('authUserEmail', state.auth.user?.email || (ENABLE_AUTH ? '' : 'Modo Offline'));
  const configWarn = $('#supabaseConfigWarn');
  if (configWarn) configWarn.style.display = state.auth.configured ? 'none' : 'block';
  updateSyncStatus();
};

const atualizarSugestoesEmpresas = () => {
  const datalist = $('#empresasSuggestions'); clear(datalist);
  [...state.empresas].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((empresa) => datalist.append(el('option', { value: empresa })));
};

const renderAll = () => {
  renderizarDashboard({ onMarcarAjudantePago: marcarAjudantePago });
  renderizarModoTrabalhoAtivo(
    $('#containerTrabalhoAtivo'),
    iniciarTrabalhoAtivo,
    pararTrabalhoAtivo
  );
  if (state.ui.currentPage === 'historico') renderizarHistorico(excluirRota);
  atualizarSugestoesEmpresas();
  updateSyncStatus();
  aplicarTemasColoresDinamicas();
};

const setPage = (page) => {
  state.ui.currentPage = page;
  $$('.page').forEach((n) => n.classList.remove('active'));
  $$('.nav-btn').forEach((n) => n.classList.remove('active'));
  $(`#page-${page}`)?.classList.add('active');
  $(`#nav-${page}`)?.classList.add('active');
  if (page === 'historico') renderizarHistorico(excluirRota); else renderAll();
};

const hydrateConfigInputs = () => {
  writeInput('custoPorKm', state.config.custoPorKm || '');
  writeInput('consumoPadrao', state.config.consumoVeiculo || '');
  writeInput('combustivelPadrao', state.config.precoCombustivel || '');
  writeInput('metaMensal', state.config.metaMensal || '');
  writeInput('parcelaCarro', state.config.parcelaCarro || '');
  writeInput('seguroMensal', state.config.seguroMensal || '');
  writeInput('manutencaoMensal', state.config.manutencaoMensal || '');
  writeInput('consumoVeiculo', state.config.consumoVeiculo || '');
  writeInput('precoCombustivel', state.config.precoCombustivel || '');
  if ($('#custoIncluiCombustivel')) $('#custoIncluiCombustivel').checked = Boolean(state.config.custoPorKmIncluiCombustivel);
};

const addPendingIfNeeded = async (path, payload) => {
  await queueSync(path, payload);
  if (navigator.onLine) await syncNow();
  updateSyncStatus();
};

const salvarConfiguracoes = async () => {
  try {
    state.config = validateConfig({
      custoPorKm: readInput('custoPorKm'),
      consumoVeiculo: readInput('consumoPadrao'),
      precoCombustivel: readInput('combustivelPadrao'),
      custoPorKmIncluiCombustivel: $('#custoIncluiCombustivel')?.checked,
      metaMensal: readInput('metaMensal'),
      parcelaCarro: readInput('parcelaCarro'),
      seguroMensal: readInput('seguroMensal'),
      manutencaoMensal: readInput('manutencaoMensal'),
    });
    await persistConfig(); hydrateConfigInputs(); renderAll(); showToast('Configuracoes salvas.', 'success');
  } catch (error) { showToast(error.message || 'Nao foi possivel salvar configuracoes.', 'error'); }
};

const salvarRota = async (input) => {
  if (ENABLE_AUTH && api.isConfigured() && !state.auth.user?.id) throw new Error('Faca login para salvar e sincronizar rotas.');
  const rota = validateRoute({ ...input, userId: state.auth.user?.id || '', custoPorKm: state.config.custoPorKm, custoPorKmIncluiCombustivel: state.config.custoPorKmIncluiCombustivel });
  state.rotas.push(rota); state.empresas.add(rota.empresa);
  if (rota.consumoVeiculo) state.config.consumoVeiculo = rota.consumoVeiculo;
  if (rota.precoCombustivel) state.config.precoCombustivel = rota.precoCombustivel;
  await DB.save('rotas', rota); await DB.save('empresas', { id: rota.empresa, nome: rota.empresa }); await persistConfig(); await addPendingIfNeeded('/rotas', rota);
  hydrateConfigInputs(); renderAll(); return rota;
};

const salvarVale = async (input) => {
  if (ENABLE_AUTH && api.isConfigured() && !state.auth.user?.id) throw new Error('Faca login para salvar e sincronizar vales.');
  const vale = validateVale({ ...input, userId: state.auth.user?.id || '' });
  state.vales.push(vale);
  await DB.save('vales', vale); await addPendingIfNeeded('/vales', vale);
  renderAll(); return vale;
};

async function excluirRota(id) {
  if (!confirm('Excluir esta rota?')) return;
  state.rotas = state.rotas.filter((r) => r.id !== id);
  await DB.remove('rotas', id); await addPendingIfNeeded('/rotas/delete', { id });
  renderAll(); showToast('Rota removida.', 'success');
}

async function marcarAjudantePago(key) {
  if (!confirm('Confirmar pagamento do ajudante?')) return;
  const safeKey = validatePaymentKey(key);
  if (!state.pagamentos.includes(safeKey)) state.pagamentos.push(safeKey);
  await DB.save('pagamentos', { id: safeKey, value: safeKey }); await addPendingIfNeeded('/pagamentos', { id: safeKey });
  renderAll(); showToast('Pagamento registrado.', 'success');
}

const abrirModoRapido = () => {
  writeInput('qEmpresa', ''); writeInput('qValor', ''); writeInput('qEntregas', '');
  writeInput('qKm', state.gps.distanciaKm > 0 ? state.gps.distanciaKm.toFixed(1) : '');
  writeInput('qDuracao', state.gps.startTime ? Math.round((Date.now() - state.gps.startTime) / 60000) : '');
  $('#modalRapido')?.classList.add('open');
};

const iniciarTrabalhoAtivo = () => {
  const metaDiaria = state.config.metaMensal > 0 ? state.config.metaMensal / 30 : 0;
  trabalhoAtivoManager.iniciarTurno(metaDiaria);
  trabalhoAtivoManager.subscribe(() => renderAll());
  showToast('Modo trabalho ativo iniciado! 🚀', 'success');
  renderAll();
};

const pararTrabalhoAtivo = () => {
  if (!confirm('Parar turno? Você ainda pode registrar rotas normalmente.')) return;
  trabalhoAtivoManager.pararTurno();
  showToast('Turno parado. Bom trabalho! 👏', 'success');
  renderAll();
};

const fecharModal = (id) => document.getElementById(id)?.classList.remove('open');

const salvarModoRapido = async () => {
  try {
    await salvarRota({ data: todayISO(), empresa: readInput('qEmpresa'), valor: readInput('qValor'), km: readInput('qKm'), duracao: readInput('qDuracao'), qtdEntregas: readInput('qEntregas'), consumoVeiculo: state.config.consumoVeiculo, precoCombustivel: state.config.precoCombustivel, ajudante: 0, outros: 0 });
    fecharModal('modalRapido'); showToast(navigator.onLine ? 'Rota registrada e sincronizada.' : 'Rota salva offline.', 'success');
  } catch (error) { showToast(error.message, 'error'); }
};

const exportarDados = () => {
  if (!confirm('Exportar backup JSON dos dados locais?')) return;
  const blob = new Blob([JSON.stringify({ ...snapshotState(), exportadoEm: new Date().toISOString(), versao: '4.0-indexeddb' }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `entrega-pro-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url);
  showToast('Backup exportado.', 'success');
};

const mergeRemoteData = async () => {
  if (!state.auth.user?.id || !navigator.onLine || !api.isConfigured()) return;
  setLoading(true, 'Sincronizando dados...');
  try {
    const [remoteRotas, remoteVales] = await Promise.all([api.buscarRotas(), api.buscarVales()]);
    const userId = state.auth.user.id;
    const localRotas = state.rotas.map((r) => validateRoute({ ...r, userId: r.userId || userId }));
    const localVales = state.vales.map((v) => validateVale({ ...v, userId: v.userId || userId }));
    const mergedRotas = api.mergeLastWriteWins(localRotas, remoteRotas);
    const mergedVales = api.mergeLastWriteWins(localVales, remoteVales);

    const remoteRotaIds = new Set(remoteRotas.map((r) => r.id));
    const remoteValeIds = new Set(remoteVales.map((v) => v.id));
    for (const rota of mergedRotas) {
      if (!remoteRotaIds.has(rota.id)) await queueSync('/rotas', rota);
    }
    for (const vale of mergedVales) {
      if (!remoteValeIds.has(vale.id)) await queueSync('/vales', vale);
    }

    state.rotas = mergedRotas;
    state.vales = mergedVales;
    state.empresas = new Set([...state.empresas, ...mergedRotas.map((r) => r.empresa)]);
    await persistSnapshot(snapshotState());
    await syncNow();
    renderAll();
  } catch (error) {
    showToast(error.message || 'Falha ao sincronizar dados.', 'error');
  } finally {
    setLoading(false);
  }
};

const importarDados = async (event) => {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
  try {
    const dados = validateImportPayload(JSON.parse(await file.text()));
    if (!confirm('Importar e mesclar este backup validado com seus dados atuais?')) return;
    const rotas = new Map(state.rotas.map((r) => [r.id, r])); dados.rotas.forEach((r) => rotas.set(r.id, r));
    const vales = new Map(state.vales.map((v) => [v.id, v])); dados.vales.forEach((v) => vales.set(v.id, v));
    state.rotas = [...rotas.values()]; state.vales = [...vales.values()]; state.pagamentos = [...new Set([...state.pagamentos, ...dados.pagamentos])];
    state.config = { ...state.config, ...dados.config }; state.empresas = new Set([...state.empresas, ...dados.empresas, ...state.rotas.map((r) => r.empresa)]);
    await persistSnapshot(snapshotState()); await addPendingIfNeeded('/sync/import', snapshotState()); hydrateConfigInputs(); renderAll(); showToast('Backup importado com seguranca.', 'success');
  } catch (error) { showToast(error.message || 'Arquivo invalido.', 'error'); }
};

const resetarSistema = async () => {
  if (!confirm('Apagar TODOS os dados locais? Exporte um backup antes de continuar.')) return;
  if (!confirm('Confirmacao final: esta acao nao pode ser desfeita.')) return;
  await Promise.all(['rotas', 'vales', 'pagamentos', 'config', 'empresas', 'syncQueue'].map((c) => DB.clear(c)));
  location.reload();
};

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const iniciarMapa = () => {
  if (state.map.instance || !window.L) return;
  state.map.instance = L.map('mapaRota', { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(state.map.instance);
};
const resetarMapa = () => {
  if (state.map.instance) { if (state.map.polyline) state.map.polyline.remove(); if (state.map.markerInicio) state.map.markerInicio.remove(); if (state.map.markerFim) state.map.markerFim.remove(); }
  state.map.polyline = null; state.map.markerInicio = null; state.map.markerFim = null; state.gps.trackPoints = [];
};
const atualizarMapa = (lat, lng, first = false) => {
  iniciarMapa(); if (!state.map.instance || !window.L) return;
  state.gps.trackPoints.push([lat, lng]);
  const brand = cssVar('--brand', '#0A66C2');
  const green = cssVar('--green', '#16A34A');
  if (state.map.polyline) state.map.polyline.setLatLngs(state.gps.trackPoints); else state.map.polyline = L.polyline(state.gps.trackPoints, { color: brand, weight: 4, opacity: 0.85 }).addTo(state.map.instance);
  if (first) state.map.markerInicio = L.marker([lat, lng], { icon: L.divIcon({ html: `<div style="background:${green};width:14px;height:14px;border-radius:50%;border:2px solid #fff"></div>`, className: '', iconAnchor: [7, 7] }) }).addTo(state.map.instance);
  state.map.instance.setView([lat, lng], 15);
};
const marcarFimMapa = (lat, lng) => {
  if (!state.map.instance || !window.L) return;
  const brand = cssVar('--brand', '#0A66C2');
  state.map.markerFim = L.marker([lat, lng], { icon: L.divIcon({ html: `<div style="background:${brand};width:14px;height:14px;border-radius:50%;border:2px solid #fff"></div>`, className: '', iconAnchor: [7, 7] }) }).addTo(state.map.instance);
  if (state.map.polyline) state.map.instance.fitBounds(state.map.polyline.getBounds(), { padding: [20, 20] });
};

const atualizarPreviewLive = () => {
  if (!state.gps.rotaAtiva) return;
  const rota = { valor: Number(readInput('valor') || 0), km: state.gps.distanciaKm, consumoVeiculo: readInput('consumoVeiculo') || state.config.consumoVeiculo, precoCombustivel: readInput('precoCombustivel') || state.config.precoCombustivel, custoPorKm: state.config.custoPorKm, custoPorKmIncluiCombustivel: state.config.custoPorKmIncluiCombustivel, ajudante: readInput('ajudante'), outros: readInput('outros') };
  const lucro = calcularLucro(rota), horas = (Date.now() - state.gps.startTime) / 1000 / 3600;
  setText('prevLucro', formatarMoeda(lucro)); setText('prevCombustivel', formatarMoeda(calcularGastoCombustivel(rota))); setText('prevLucroHora', `R$${Math.round(horas > 0 ? lucro / horas : 0)}/h`);
  $('#previewLiveBox')?.classList.toggle('negative', lucro < 0); if ($('#alertaNegativo')) $('#alertaNegativo').style.display = lucro < 0 ? 'block' : 'none';
};

const iniciarRotaGPS = () => {
  if (state.gps.rotaAtiva) return;
  if (!navigator.geolocation) { showToast('GPS nao disponivel neste aparelho.', 'error'); return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    state.gps.rotaAtiva = true; state.gps.startTime = Date.now(); state.gps.lastCoords = pos.coords; state.gps.distanciaKm = 0; resetarMapa(); atualizarMapa(pos.coords.latitude, pos.coords.longitude, true);
    setText('gpsInicio', new Date().toLocaleTimeString('pt-BR')); $('#btnIniciarRota').disabled = true; $('#btnFinalizarRota').disabled = false; $('#previewLive').style.display = 'block';
    state.gps.timerInterval = setInterval(() => { const e = Date.now() - state.gps.startTime, h = Math.floor(e / 3600000), m = Math.floor((e % 3600000) / 60000), s = Math.floor((e % 60000) / 1000); setText('gpsDuracao', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`); }, 1000);
    state.gps.previewInterval = setInterval(atualizarPreviewLive, 5000);
    state.gps.watchId = navigator.geolocation.watchPosition((next) => {
      if (next.coords.accuracy > 35) return;
      const last = state.gps.lastCoords, d = calcularDistancia(last.latitude, last.longitude, next.coords.latitude, next.coords.longitude);
      if (d > 0.01 && d < 1) { state.gps.distanciaKm += d; setText('gpsKm', `${state.gps.distanciaKm.toFixed(2)} km`); atualizarMapa(next.coords.latitude, next.coords.longitude); }
      if (next.coords.speed != null) setText('gpsVelocidade', `${(next.coords.speed * 3.6).toFixed(0)} km/h`);
      state.gps.lastCoords = next.coords;
    }, () => showToast('Nao foi possivel obter GPS.', 'error'), { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 });
    showToast('Rota iniciada.', 'success');
  }, () => showToast('Permissao de GPS negada ou indisponivel.', 'error'), { enableHighAccuracy: true });
};

const finalizarRotaGPS = () => {
  if (!state.gps.rotaAtiva) return;
  state.gps.rotaAtiva = false; clearInterval(state.gps.timerInterval); clearInterval(state.gps.previewInterval); if (state.gps.watchId) navigator.geolocation.clearWatch(state.gps.watchId);
  const min = Math.round((Date.now() - state.gps.startTime) / 60000), km = state.gps.distanciaKm.toFixed(1);
  if (state.gps.lastCoords) marcarFimMapa(state.gps.lastCoords.latitude, state.gps.lastCoords.longitude);
  $('#btnIniciarRota').disabled = false; $('#btnFinalizarRota').disabled = true; $('#previewLive').style.display = 'none'; writeInput('km', km); writeInput('duracao', min); writeInput('data', todayISO());
  showToast(`Rota finalizada: ${km} km em ${min}min.`, 'success');
};

const bindEvents = () => {
  $('[data-action="go-settings"]')?.addEventListener('click', () => setPage('settings'));
  $('[data-action="quick-route"]')?.addEventListener('click', abrirModoRapido);
  $('[data-action="export"]')?.addEventListener('click', exportarDados);
  $('[data-action="import"]')?.addEventListener('click', () => $('#importInput')?.click());
  $('[data-action="firebase"]')?.addEventListener('click', () => showToast('Backend preparado. Configure a URL da API quando estiver pronto.', ''));
  $('[data-action="logout"]')?.addEventListener('click', async () => {
    try { await auth.logout(); updateAuthUI(); showToast('Logout realizado.', 'success'); } catch (error) { showToast(error.message, 'error'); }
  });
  $('[data-action="google-login"]')?.addEventListener('click', async () => {
    try {
      setLoading(true, 'Redirecionando para o Google...');
      await auth.signInWithGoogle();
    } catch (error) {
      showToast(error.message || 'Falha no login com Google.', 'error');
      setLoading(false);
    }
  });
  $('#authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true, 'Entrando...');
    try {
      await auth.login(readInput('authEmail'), readInput('authPassword'));
      updateAuthUI();
      await mergeRemoteData();
      showToast('Login realizado.', 'success');
    } catch (error) { showToast(error.message || 'Falha no login.', 'error'); }
    finally { setLoading(false); }
  });
  $('[data-action="signup"]')?.addEventListener('click', async () => {
    setLoading(true, 'Criando conta...');
    try {
      await auth.signup(readInput('authEmail'), readInput('authPassword'), readInput('authNome'));
      updateAuthUI();
      await mergeRemoteData();
      showToast('Conta criada. Se o Supabase exigir confirmacao, verifique seu email.', 'success');
    } catch (error) { showToast(error.message || 'Falha ao criar conta.', 'error'); }
    finally { setLoading(false); }
  });
  $('[data-action="close-quick"]')?.addEventListener('click', () => fecharModal('modalRapido'));
  $('[data-action="save-quick"]')?.addEventListener('click', salvarModoRapido);
  $$('.nav-btn[data-page]').forEach((b) => b.addEventListener('click', () => setPage(b.dataset.page)));
  $$('.chart-tab[data-chart-mode]').forEach((b) => b.addEventListener('click', () => { state.ui.chartMode = b.dataset.chartMode; $$('.chart-tab').forEach((t) => t.classList.remove('active')); b.classList.add('active'); renderizarGrafico(); }));
  ['custoPorKm', 'consumoPadrao', 'combustivelPadrao', 'custoIncluiCombustivel', 'metaMensal', 'parcelaCarro', 'seguroMensal', 'manutencaoMensal'].forEach((id) => document.getElementById(id)?.addEventListener('change', salvarConfiguracoes));
  $('#importInput')?.addEventListener('change', importarDados); $('#btnResetar')?.addEventListener('click', resetarSistema); $('#btnIniciarRota')?.addEventListener('click', iniciarRotaGPS); $('#btnFinalizarRota')?.addEventListener('click', finalizarRotaGPS);
  $$('.modal-overlay').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); }));
  $('#filtroMes')?.addEventListener('change', (e) => { state.ui.mesFiltrado = e.target.value; renderAll(); });
  $('#formRota')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await salvarRota({ data: readInput('data'), empresa: readInput('empresa'), valor: readInput('valor'), km: readInput('km'), duracao: readInput('duracao'), qtdEntregas: readInput('qtdEntregas'), consumoVeiculo: readInput('consumoVeiculo') || state.config.consumoVeiculo, precoCombustivel: readInput('precoCombustivel') || state.config.precoCombustivel, ajudante: readInput('ajudante'), outros: readInput('outros') }); e.target.reset(); writeInput('data', todayISO()); writeInput('ajudante', 0); writeInput('outros', 0); hydrateConfigInputs(); setPage('home'); showToast(navigator.onLine ? 'Rota salva e enviada para sincronizacao.' : 'Rota salva offline.', 'success'); } catch (error) { showToast(error.message, 'error'); }
  });
  $('#formVale')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await salvarVale({ dataVale: readInput('dataVale'), valorVale: readInput('valorVale'), descricao: readInput('descricaoVale') }); e.target.reset(); writeInput('dataVale', todayISO()); setPage('home'); showToast('Vale registrado.', 'success'); } catch (error) { showToast(error.message, 'error'); }
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.pwa.deferredPrompt = e; $('#installBanner')?.classList.add('show'); });
  $('#btnInstall')?.addEventListener('click', async () => { if (!state.pwa.deferredPrompt) return; state.pwa.deferredPrompt.prompt(); const { outcome } = await state.pwa.deferredPrompt.userChoice; state.pwa.deferredPrompt = null; $('#installBanner')?.classList.remove('show'); if (outcome === 'accepted') showToast('App instalado.', 'success'); });
  $('#btnDismiss')?.addEventListener('click', () => $('#installBanner')?.classList.remove('show'));
};

const init = async () => {
  try { await migrateFromLocalStorage(); replaceState(await loadSnapshot()); } catch { showToast('Nao foi possivel carregar dados locais.', 'error'); }
  const h = new Date(), filtro = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
  state.ui.mesFiltrado = filtro; writeInput('filtroMes', filtro); writeInput('data', todayISO()); writeInput('dataVale', todayISO()); hydrateConfigInputs();
  $$('input[type="number"]').forEach((i) => i.setAttribute('min', '0'));
  bindEvents(); iniciarMapa();
  if (ENABLE_AUTH) {
    try {
      await auth.init(async () => { updateAuthUI(); await mergeRemoteData(); });
    } catch (error) {
      showToast(error.message || 'Falha ao iniciar autenticacao.', 'error');
    }
  } else {
    // MODO BYPASS: app abre direto e trabalha somente com banco local.
    state.auth.user = null;
    state.auth.configured = false;
  }
  renderAll(); updateAuthUI(); await mergeRemoteData(); scheduleSync(updateSyncStatus);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
};

document.addEventListener('DOMContentLoaded', init);
