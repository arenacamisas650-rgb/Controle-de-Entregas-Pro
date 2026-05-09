export const state = {
  rotas: [],
  vales: [],
  pagamentos: [],
  empresas: new Set(['Shopee', 'Amazon', 'Mercado Livre', 'iFood', 'Rappi', 'Loggi']),
  config: {
    custoPorKm: 0,
    consumoVeiculo: '',
    precoCombustivel: '',
    custoPorKmIncluiCombustivel: false,
    metaMensal: 0,
    parcelaCarro: 0,
    seguroMensal: 0,
    manutencaoMensal: 0,
  },
  ui: { mesFiltrado: null, chartMode: 'diario', currentPage: 'home' },
  gps: { rotaAtiva: false, startTime: null, lastCoords: null, distanciaKm: 0, trackPoints: [], timerInterval: null, previewInterval: null, watchId: null },
  map: { instance: null, polyline: null, markerInicio: null, markerFim: null },
  pwa: { deferredPrompt: null },
  auth: { configured: false, loading: true, session: null, user: null, event: null },
  loading: { auth: false, data: false, save: false, sync: false },
  error: null,
  sync: { pendentes: [], status: navigator.onLine ? 'online' : 'offline', syncing: false, lastSyncAt: null },
  integrations: { nuvemshop: { enabled: false, ready: false } },
  trabalhoAtivo: { 
    ativo: false, 
    inicioTurno: null, 
    lucroAtual: 0, 
    metaDiaria: 0, 
    faltaParaMeta: 0, 
    ganhoPorHora: 0, 
    previsaoFinal: 0, 
    rotasHoje: [], 
    alertas: [], 
    ultimaAtualizacao: null, 
    statusMeta: 'em-progresso', 
    sugestao: null 
  },
};

export const snapshotState = () => ({
  rotas: state.rotas,
  vales: state.vales,
  pagamentos: state.pagamentos,
  empresas: [...state.empresas],
  config: state.config,
  pendentes: state.sync.pendentes,
});

export const replaceState = (snapshot) => {
  state.rotas = snapshot.rotas || [];
  state.vales = snapshot.vales || [];
  state.pagamentos = snapshot.pagamentos || [];
  state.config = { ...state.config, ...(snapshot.config || {}) };
  state.sync.pendentes = snapshot.pendentes || [];
  state.empresas = new Set([...state.empresas, ...(snapshot.empresas || []), ...state.rotas.map((r) => r.empresa).filter(Boolean)]);
};
