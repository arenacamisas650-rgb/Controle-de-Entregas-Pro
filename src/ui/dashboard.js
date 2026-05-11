import { state } from '../state.js';
import {
  calcularInsightsMotorista,
  calcularLucro,
  calcularMetaMensal,
  calcularPlanoDoDia,
  calcularPerformance,
  calcularResumoDia,
  calcularResumoMensal,
  filtrarRotasPorData,
  filtrarRotasPorMes,
  filtrarValesPorMes,
  formatarMoeda,
  obterMesAnoFiltrado,
  projetarMesPorDiasTrabalhados,
  calcularPerformancePeriodo,
  calcularPerformanceSemanal,
  calcularMelhorEPiorDia,
  gerarInsightsPerformance,
} from '../calculations.js';
import { clear, el, renderEmpty, setText } from './dom.js';

let chartInstance = null;
let weeklyChartInstance = null;
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

const rotasSemanaAtual = () => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(hoje); const dia = hoje.getDay();
  inicio.setDate(hoje.getDate() - (dia === 0 ? 6 : dia - 1));
  const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6);
  return state.rotas.filter((r) => { const d = new Date(`${r.data}T00:00:00`); return d >= inicio && d <= fim; });
};

export const renderizarSemanaAtual = () => {
  const rotas = rotasSemanaAtual();
  const lucro = rotas.reduce((a, r) => a + calcularLucro(r), 0);
  const ajudante = rotas.reduce((a, r) => a + Number(r.ajudante || 0), 0);
  const km = rotas.reduce((a, r) => a + Number(r.km || 0), 0);
  const perf = calcularPerformance(rotas);
  setText('statLucroSemana', formatarMoeda(lucro));
  setText('statAjudanteSemana', formatarMoeda(ajudante));
  setText('statRotasSemana', rotas.length);
  setText('statKmSemana', `${km.toFixed(0)} km`);
  setText('perfLucroHora', perf.lucroHora != null ? `R$${Math.round(perf.lucroHora)}` : '-');
  setText('perfEntregasHora', perf.entregasHora != null ? perf.entregasHora.toFixed(1) : '-');
  setText('perfValorEntrega', perf.valorEntrega != null ? `R$${Math.round(perf.valorEntrega)}` : '-');
};

export const renderizarResumoDia = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  const hojeISO = new Date().toISOString().slice(0, 10);
  const resumo = calcularResumoDia(filtrarRotasPorData(state.rotas, hojeISO), ano, mes);
  setText('statLucroDia', formatarMoeda(resumo.lucro));
  setText('statCustoDia', formatarMoeda(resumo.custoTotal));
  setText('statKmDia', `${resumo.km.toFixed(1)} km`);
  setText('statEficienciaDia', resumo.eficienciaKm != null ? `${formatarMoeda(resumo.eficienciaKm)}/km` : '-');
};

export const renderizarModoHoje = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  const hojeISO = new Date().toISOString().slice(0, 10);
  const rotasHoje = filtrarRotasPorData(state.rotas, hojeISO);
  const rotasMes = filtrarRotasPorMes(state.rotas, ano, mes);
  const valesMes = filtrarValesPorMes(state.vales, ano, mes);
  const resumoDia = calcularResumoDia(rotasHoje, ano, mes);
  const resumoMes = calcularResumoMensal(rotasMes, valesMes);
  const meta = calcularMetaMensal(resumoMes.totalLucro, ano, mes);
  const ganhoPorEntrega = resumoMes.lucroPorEntrega ?? resumoDia.lucroPorEntrega ?? 0;
  const ganhoPorKm = resumoMes.eficienciaKm ?? resumoDia.eficienciaKm ?? 0;
  const plano = calcularPlanoDoDia({
    lucroHoje: resumoDia.lucro,
    metaDiaria: meta.necessarioPorDia,
    custoFixoDiario: resumoDia.fixoDia,
    ganhoPorEntrega,
    ganhoPorKm,
  });

  setText('hojeMetaDia', formatarMoeda(plano.metaHoje));
  setText('hojeMinimo', formatarMoeda(plano.minimoSemPrejuizo));
  setText('hojeEntregas', plano.entregasNecessarias > 0 ? `${plano.entregasNecessarias}` : '-');
  setText('hojeKm', plano.kmNecessario > 0 ? `${plano.kmNecessario} km` : '-');
  setText('hojeRestante', formatarMoeda(plano.restante));

  const mensagem = plano.emPrejuizo
    ? 'Atencao: voce esta no prejuizo hoje'
    : plano.metaAtingida
      ? 'Voce ja bateu a meta do dia'
      : 'Voce ainda nao bateu a meta hoje';

  const status = document.getElementById('hojeStatus');
  if (status) {
    status.textContent = mensagem;
    status.className = `today-status ${plano.emPrejuizo ? 'danger' : plano.metaAtingida ? 'success' : 'info'}`;
  }

  const card = document.getElementById('modoHojeCard');
  if (card) {
    card.classList.toggle('success', plano.metaAtingida && !plano.emPrejuizo);
    card.classList.toggle('danger', plano.emPrejuizo);
  }
};

export const renderizarAjudante = (onPago) => {
  const container = document.getElementById('ajudanteSection'); clear(container);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diasSub = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const fim = new Date(hoje); fim.setDate(hoje.getDate() - diasSub);
  const inicio = new Date(fim); inicio.setDate(fim.getDate() - 6);
  const key = inicio.toISOString().split('T')[0];
  const total = state.rotas.filter((r) => { const d = new Date(`${r.data}T00:00:00`); return d >= inicio && d <= fim; }).reduce((a, r) => a + Number(r.ajudante || 0), 0);
  const pago = state.pagamentos.includes(key);
  if (total === 0 && !pago) return;
  const card = el('div', { className: 'ajudante-card' }, [
    el('span', { className: 'ajudante-badge', text: pago ? 'Pago' : 'Pendente' }),
    el('div', { text: 'Ajudante semana anterior', style: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' } }),
    el('div', { text: formatarMoeda(total), style: { fontSize: '24px', fontWeight: '800', fontFamily: "'Space Mono', monospace", color: pago ? 'var(--green)' : 'var(--yellow)', marginBottom: '12px' } }),
  ]);
  if (!pago) card.append(el('button', { className: 'btn btn-primary btn-sm', text: 'Marcar como Pago', onclick: () => onPago(key) }));
  container.append(card);
};

export const renderizarResumoMensal = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  const nome = new Date(ano, mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const resumo = calcularResumoMensal(filtrarRotasPorMes(state.rotas, ano, mes), filtrarValesPorMes(state.vales, ano, mes));
  setText('tituloResumoMensal', `Resumo - ${nome}`);
  setText('statFaturado', formatarMoeda(resumo.totalFaturado));
  setText('statGastos', formatarMoeda(resumo.totalGastos));
  setText('statLucro', formatarMoeda(resumo.totalLucro));
  setText('statVales', formatarMoeda(resumo.totalVales));
  setText('statCombustivelMes', formatarMoeda(resumo.combustivel));
  setText('statFixosMes', formatarMoeda(resumo.custosFixos));
  setText('statKmMes', `${resumo.kmTotal.toFixed(0)} km`);
  setText('statEficienciaMes', resumo.eficienciaKm != null ? `${formatarMoeda(resumo.eficienciaKm)}/km` : '-');
  setText('statGanhoEntrega', resumo.ganhoMedioEntrega != null ? formatarMoeda(resumo.ganhoMedioEntrega) : '-');
  setText('statCustoEntrega', resumo.custoPorEntrega != null ? formatarMoeda(resumo.custoPorEntrega) : '-');
  setText('statLucroEntrega', resumo.lucroPorEntrega != null ? formatarMoeda(resumo.lucroPorEntrega) : '-');
  const saldo = document.getElementById('statSaldo');
  saldo.textContent = formatarMoeda(resumo.saldo);
  saldo.className = `stat-value ${resumo.saldo >= 0 ? 'green' : 'red'}`;
};

export const renderizarMetas = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  const rotasMes = filtrarRotasPorMes(state.rotas, ano, mes);
  const valesMes = filtrarValesPorMes(state.vales, ano, mes);
  const resumo = calcularResumoMensal(rotasMes, valesMes);
  const meta = calcularMetaMensal(resumo.totalLucro, ano, mes);

  setText('statMetaMensal', formatarMoeda(meta.metaMensal));
  setText('statMetaFeito', formatarMoeda(meta.realizado));
  setText('statMetaFalta', formatarMoeda(meta.falta));
  setText('statMetaDia', formatarMoeda(meta.necessarioPorDia));
  setText('statMetaProgresso', `${meta.progresso.toFixed(0)}%`);

  const bar = document.getElementById('metaProgressBar');
  if (bar) bar.style.width = `${meta.progresso}%`;
};

export const renderizarInsights = () => {
  const c = document.getElementById('insightsDashboard'); clear(c);
  if (!state.rotas.length) { renderEmpty(c, 'Adicione rotas para ver insights'); return; }
  const { ano, mes } = obterMesAnoFiltrado();
  const rotasMes = filtrarRotasPorMes(state.rotas, ano, mes);
  const previsao = projetarMesPorDiasTrabalhados(rotasMes, ano, mes);
  const insights = calcularInsightsMotorista(rotasMes.length ? rotasMes : state.rotas);
  const lucroEmpresa = {};
  state.rotas.forEach((r) => { lucroEmpresa[r.empresa] = (lucroEmpresa[r.empresa] || 0) + calcularLucro(r); });
  const melhor = Object.entries(lucroEmpresa).sort((a, b) => b[1] - a[1])[0];
  const cards = [
    ['Previsao do mes', formatarMoeda(previsao), 'dias da semana ja trabalhados'],
    ['Media diaria', formatarMoeda(insights.mediaDiaria), 'media dos dias com trabalho'],
    ['Sugestao de meta diaria', formatarMoeda(insights.sugestaoMetaDiaria), '10% acima da media atual'],
  ];
  if (insights.melhorDia) cards.push(['Melhor dia da semana', insights.melhorDia.nome, `${formatarMoeda(insights.melhorDia.media)} em media`]);
  if (insights.piorDia) cards.push(['Pior dia da semana', insights.piorDia.nome, `${formatarMoeda(insights.piorDia.media)} em media`]);
  if (melhor) cards.push(['Empresa mais lucrativa', melhor[0], `${formatarMoeda(melhor[1])} total`]);
  cards.forEach(([t, v, s]) => c.append(el('div', { className: 'insight-card' }, [el('div', { className: 'insight-icon', text: '>' }), el('div', {}, [el('div', { className: 'insight-title', text: t }), el('div', { className: 'insight-value', text: v }), el('div', { className: 'insight-sub', text: s })])])));
};

export const renderizarDiasSemana = () => {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'], totais = [0, 0, 0, 0, 0, 0, 0], conts = [0, 0, 0, 0, 0, 0, 0];
  state.rotas.forEach((r) => { const d = new Date(`${r.data}T00:00:00`).getDay(); totais[d] += calcularLucro(r); conts[d] += 1; });
  const medias = totais.map((t, i) => (conts[i] ? t / conts[i] : 0)), max = Math.max(...medias), c = document.getElementById('diasSemanaBar');
  clear(c);
  nomes.forEach((n, i) => c.append(el('div', { className: `day-item ${medias[i] === max && max > 0 ? 'best' : ''}` }, [el('div', { className: 'day-name', text: n }), el('div', { className: 'day-value', text: medias[i] > 0 ? `R$${Math.round(medias[i])}` : '-' })])));
};

export const renderizarPerformance = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  const rotas = filtrarRotasPorMes(state.rotas, ano, mes);
  const performance = calcularPerformancePeriodo(rotas, { ano, mes });
  const diasSemana = calcularPerformanceSemanal(rotas);
  const { melhorDia, piorDia } = calcularMelhorEPiorDia(diasSemana);
  const insights = gerarInsightsPerformance(performance, state.config);

  const container = document.getElementById('performanceDashboard');
  if (!container) return;
  clear(container);

  const titulo = new Date(ano, mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  container.append(el('div', { className: 'performance-section' }, [
    el('div', { className: 'section-title', text: `📊 Performance - ${titulo}` }),
    el('div', { className: 'performance-grid' }, [
      el('div', { className: 'perf-card' }, [
        el('div', { className: 'perf-label', text: 'Lucro Total' }),
        el('div', { className: 'perf-value green', text: formatarMoeda(performance.totalLucro) }),
        el('div', { className: 'perf-meta', text: `${performance.diasTrabalhados} dias` }),
      ]),
      el('div', { className: 'perf-card' }, [
        el('div', { className: 'perf-label', text: 'Média Diária' }),
        el('div', { className: 'perf-value blue', text: formatarMoeda(performance.mediaDiaria) }),
        el('div', { className: 'perf-meta', text: `por dia trabalhado` }),
      ]),
      el('div', { className: 'perf-card' }, [
        el('div', { className: 'perf-label', text: 'KM Total' }),
        el('div', { className: 'perf-value', text: `${performance.totalKm.toFixed(0)} km` }),
        el('div', { className: 'perf-meta', text: `${(performance.totalKm / performance.diasTrabalhados || 0).toFixed(0)}km/dia` }),
      ]),
      el('div', { className: 'perf-card' }, [
        el('div', { className: 'perf-label', text: 'Entregas' }),
        el('div', { className: 'perf-value', text: `${performance.totalEntregas}` }),
        el('div', { className: 'perf-meta', text: `${(performance.totalEntregas / performance.diasTrabalhados || 0).toFixed(0)}/dia` }),
      ]),
    ]),
  ]));

  container.append(el('div', { className: 'performance-section' }, [
    el('div', { className: 'section-title', text: '⚡ Eficiência' }),
    el('div', { className: 'efficiency-grid' }, [
      el('div', { className: 'eff-card' }, [
        el('div', { className: 'eff-label', text: 'R$/Hora' }),
        el('div', { className: 'eff-value', text: `R$${performance.ganhoPorHora.toFixed(2)}` }),
      ]),
      el('div', { className: 'eff-card' }, [
        el('div', { className: 'eff-label', text: 'R$/KM' }),
        el('div', { className: 'eff-value', text: `R$${performance.ganhoPorKm.toFixed(2)}` }),
      ]),
      el('div', { className: 'eff-card' }, [
        el('div', { className: 'eff-label', text: 'R$/Entrega' }),
        el('div', { className: 'eff-value', text: `R$${performance.ganhoPorEntrega.toFixed(2)}` }),
      ]),
      el('div', { className: 'eff-card' }, [
        el('div', { className: 'eff-label', text: 'Horas Trabalhadas' }),
        el('div', { className: 'eff-value', text: `${performance.totalHoras.toFixed(0)}h` }),
      ]),
    ]),
  ]));

  container.append(el('div', { className: 'performance-section' }, [
    el('div', { className: 'section-title', text: '🏆 Melhor vs Pior Dia' }),
    el('div', { className: 'best-worst-grid' }, [
      melhorDia ? el('div', { className: 'best-day' }, [
        el('div', { className: 'best-icon', text: '🏅' }),
        el('div', { className: 'best-label', text: 'Melhor Dia' }),
        el('div', { className: 'best-name', text: melhorDia.nome }),
        el('div', { className: 'best-value', text: formatarMoeda(melhorDia.media) }),
        el('div', { className: 'best-meta', text: `${melhorDia.count} dia(s)` }),
      ]) : el('div', { className: 'no-data', text: 'Sem dados' }),
      piorDia ? el('div', { className: 'worst-day' }, [
        el('div', { className: 'worst-icon', text: '📉' }),
        el('div', { className: 'worst-label', text: 'Pior Dia' }),
        el('div', { className: 'worst-name', text: piorDia.nome }),
        el('div', { className: 'worst-value', text: formatarMoeda(piorDia.media) }),
        el('div', { className: 'worst-meta', text: `${piorDia.count} dia(s)` }),
      ]) : el('div', { className: 'no-data', text: 'Sem dados' }),
    ]),
  ]));

  if (insights.length > 0) {
    container.append(el('div', { className: 'performance-section' }, [
      el('div', { className: 'section-title', text: '💡 Insights' }),
      ...insights.map((insight) =>
        el('div', { className: `insight-item insight-${insight.tipo}` }, [
          el('div', { className: 'insight-header' }, [
            el('div', { className: 'insight-icon', text: insight.titulo.split(' ')[0] }),
            el('div', { className: 'insight-title', text: insight.titulo.substring(2) }),
          ]),
          el('div', { className: 'insight-message', text: insight.mensagem }),
        ])
      ),
    ]));
  }
};

export const renderizarGraficoSemanal = () => {
  const canvas = document.getElementById('graficoSemanal');
  if (!canvas || !window.Chart) return;

  const rotas = state.rotas;
  const diasSemana = calcularPerformanceSemanal(rotas);

  const labels = diasSemana.map((d) => d.nome);
  const data = diasSemana.map((d) => d.media);

  const brand = cssVar('--brand', '#0A66C2');
  const blue = cssVar('--blue', '#1E88E5');
  const green = cssVar('--green', '#16A34A');
  const brandFill = cssVar('--chart-brand-fill', 'rgba(10,102,194,0.14)');

  const dataset = {
    label: 'Ganho Médio (R$)',
    data,
    backgroundColor: brandFill,
    borderColor: blue,
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    pointBackgroundColor: data.map((v) => (v > 0 ? green : '#e0e0e0')),
    pointRadius: 6,
    pointHoverRadius: 8,
  };

  if (!weeklyChartInstance) {
    weeklyChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => `R$${value}` },
          },
        },
      },
    });
    return;
  }

  weeklyChartInstance.data.labels = labels;
  weeklyChartInstance.data.datasets[0] = dataset;
  weeklyChartInstance.update();
};

export const renderizarGrafico = () => {
  const { ano, mes } = obterMesAnoFiltrado();
  setText('tituloGrafico', `Evolucao - ${new Date(ano, mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`);
  const rotas = filtrarRotasPorMes(state.rotas, ano, mes), porDia = {};
  rotas.forEach((r) => { const d = new Date(`${r.data}T00:00:00`).getDate(); porDia[d] = (porDia[d] || 0) + calcularLucro(r); });
  let labels = [], data = [];
  if (state.ui.chartMode === 'semanal') {
    const sem = {}; rotas.forEach((r) => { const k = `Sem ${Math.ceil(new Date(`${r.data}T00:00:00`).getDate() / 7)}`; sem[k] = (sem[k] || 0) + calcularLucro(r); });
    labels = Object.keys(sem); data = Object.values(sem);
  } else {
    let acc = 0; Object.keys(porDia).sort((a, b) => Number(a) - Number(b)).forEach((d) => { labels.push(d); acc += porDia[d]; data.push(state.ui.chartMode === 'acumulado' ? acc : porDia[d]); });
  }
  const isLine = state.ui.chartMode === 'acumulado', canvas = document.getElementById('graficoLucros');
  if (!canvas || !window.Chart) return;
  const brand = cssVar('--brand', '#0A66C2');
  const green = cssVar('--green', '#16A34A');
  const red = cssVar('--red', '#DC2626');
  const brandFill = cssVar('--chart-brand-fill', 'rgba(10,102,194,0.14)');
  const greenFill = cssVar('--chart-success-fill', 'rgba(22,163,74,0.72)');
  const redFill = cssVar('--chart-danger-fill', 'rgba(220,38,38,0.72)');
  const dataset = {
    label: 'Lucro (R$)',
    data,
    backgroundColor: isLine ? brandFill : data.map((v) => (v >= 0 ? greenFill : redFill)),
    borderColor: isLine ? brand : data.map((v) => (v >= 0 ? green : red)),
    borderWidth: isLine ? 2 : 1,
    fill: isLine,
    tension: 0.4,
  };
  if (!chartInstance || chartInstance.config.type !== (isLine ? 'line' : 'bar')) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext('2d'), { type: isLine ? 'line' : 'bar', data: { labels, datasets: [dataset] }, options: { responsive: true, plugins: { legend: { display: false } } } });
  } else { chartInstance.data.labels = labels; chartInstance.data.datasets[0] = dataset; chartInstance.update(); }
};

export const renderizarDashboard = (handlers) => {
  renderizarModoHoje();
  renderizarResumoDia();
  renderizarSemanaAtual();
  renderizarAjudante(handlers.onMarcarAjudantePago);
  renderizarResumoMensal();
  renderizarMetas();
  renderizarPerformance();
  renderizarInsights();
  renderizarDiasSemana();
  renderizarGrafico();
  renderizarGraficoSemanal();
};
