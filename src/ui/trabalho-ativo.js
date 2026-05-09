import { state } from '../state.js';
import { el, clear, setText } from './dom.js';
import { formatarMoeda } from '../calculations.js';

export const renderizarModoTrabalhoAtivo = (container, onIniciar, onParar) => {
  if (!state.trabalhoAtivo.ativo) {
    renderizarCardIniciarTurno(container, onIniciar);
    return;
  }

  clear(container);

  const card = el('div', { className: 'trabalho-ativo-card' }, [
    renderizarHeaderTurno(),
    renderizarMetricasEmTempoReal(),
    renderizarPrevisaoFinal(),
    renderizarBarraProgresso(),
    renderizarAlertas(),
    renderizarSugestao(),
    el('button', {
      className: 'btn btn-danger btn-lg',
      text: 'Parar Turno',
      onclick: onParar,
      style: { marginTop: '16px', width: '100%' },
    }),
  ]);

  container.append(card);
};

const renderizarCardIniciarTurno = (container, onIniciar) => {
  clear(container);

  const card = el('div', { className: 'card card-empty' }, [
    el('div', { style: { textAlign: 'center', padding: '24px' } }, [
      el('div', { text: '⏱️', style: { fontSize: '48px', marginBottom: '16px' } }),
      el('h3', { text: 'Modo Trabalho Ativo', style: { marginBottom: '8px' } }),
      el('p', {
        text: 'Inicie seu turno para acompanhar métricas em tempo real',
        style: { color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' },
      }),
      el('button', {
        className: 'btn btn-primary btn-lg',
        text: 'Iniciar Turno',
        onclick: onIniciar,
        style: { width: '100%' },
      }),
    ]),
  ]);

  container.append(card);
};

const renderizarHeaderTurno = () => {
  const tempoDecorrido = state.trabalhoAtivo.inicioTurno
    ? Math.floor((Date.now() - state.trabalhoAtivo.inicioTurno.getTime()) / 60000)
    : 0;
  const horas = Math.floor(tempoDecorrido / 60);
  const minutos = tempoDecorrido % 60;

  return el('div', { className: 'trabalho-header' }, [
    el('div', {}, [
      el('div', { className: 'trabalho-label', text: 'Turno Ativo' }),
      el('div', {
        className: 'trabalho-tempo',
        text: `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
      }),
    ]),
    el('div', {
      className: `trabalho-badge ${state.trabalhoAtivo.statusMeta}`,
      text: obterTextoStatus(state.trabalhoAtivo.statusMeta),
    }),
  ]);
};

const renderizarMetricasEmTempoReal = () => {
  return el('div', { className: 'metricas-grid' }, [
    el('div', { className: 'metrica-item' }, [
      el('div', { className: 'metrica-label', text: 'Lucro Hoje' }),
      el('div', {
        className: `metrica-valor ${state.trabalhoAtivo.lucroAtual >= state.trabalhoAtivo.metaDiaria ? 'verde' : 'amarelo'}`,
        text: formatarMoeda(state.trabalhoAtivo.lucroAtual),
      }),
    ]),
    el('div', { className: 'metrica-item' }, [
      el('div', { className: 'metrica-label', text: 'Ganho/Hora' }),
      el('div', { className: 'metrica-valor', text: formatarMoeda(state.trabalhoAtivo.ganhoPorHora) }),
    ]),
    el('div', { className: 'metrica-item' }, [
      el('div', { className: 'metrica-label', text: 'Meta Diária' }),
      el('div', { className: 'metrica-valor', text: formatarMoeda(state.trabalhoAtivo.metaDiaria) }),
    ]),
    el('div', { className: 'metrica-item' }, [
      el('div', { className: 'metrica-label', text: 'Faltam' }),
      el('div', {
        className: `metrica-valor ${state.trabalhoAtivo.faltaParaMeta <= 0 ? 'verde' : 'vermelho'}`,
        text: formatarMoeda(Math.max(0, state.trabalhoAtivo.faltaParaMeta)),
      }),
    ]),
  ]);
};

const renderizarPrevisaoFinal = () => {
  const previsao = state.trabalhoAtivo.previsaoFinal;
  const meta = state.trabalhoAtivo.metaDiaria;
  const cor = previsao >= meta ? 'verde' : previsao >= meta * 0.9 ? 'amarelo' : 'vermelho';

  return el('div', { className: 'previsao-container' }, [
    el('div', { className: 'previsao-label', text: 'Previsão do Dia' }),
    el('div', { className: `previsao-valor ${cor}`, text: formatarMoeda(previsao) }),
    el('div', {
      className: 'previsao-desc',
      text: `${previsao >= meta ? '✅ Vai bater' : '⚠️ Pode não bater'} a meta`,
    }),
  ]);
};

const renderizarBarraProgresso = () => {
  const percentual = Math.min(100, Math.max(0, (state.trabalhoAtivo.lucroAtual / state.trabalhoAtivo.metaDiaria) * 100));
  const cor = percentual >= 100 ? 'verde' : percentual >= 80 ? 'amarelo' : 'vermelho';

  return el('div', { className: 'progresso-container' }, [
    el('div', { className: 'progresso-header' }, [
      el('span', { text: 'Progresso da Meta' }),
      el('span', { text: `${percentual.toFixed(0)}%` }),
    ]),
    el('div', { className: 'progresso-barra' }, [
      el('div', {
        className: `progresso-fill ${cor}`,
        style: { width: `${percentual}%` },
      }),
    ]),
  ]);
};

const renderizarAlertas = () => {
  const alertas = state.trabalhoAtivo.alertas || [];

  if (!alertas.length) {
    return el('div', { className: 'alertas-container empty' }, [
      el('div', { className: 'alertas-vazio', text: '✅ Nenhum alerta no momento' }),
    ]);
  }

  return el('div', { className: 'alertas-container' }, [
    el('div', { className: 'alertas-titulo', text: 'Alertas' }),
    ...alertas.map((alerta) =>
      el('div', {
        className: `alerta alerta-${alerta.tipo}`,
        style: {
          marginBottom: '8px',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
        },
      }, [
        el('div', {
          className: 'alerta-titulo',
          text: alerta.titulo,
          style: { fontWeight: '600', marginBottom: '4px' },
        }),
        el('div', { className: 'alerta-mensagem', text: alerta.mensagem }),
      ])
    ),
  ]);
};

const renderizarSugestao = () => {
  const sugestao = state.trabalhoAtivo.sugestao;

  if (!sugestao) {
    return el('div', {
      className: 'sugestao-container',
      style: { display: 'none' },
    });
  }

  const tipoClasse = `sugestao-${sugestao.tipo}`;

  return el('div', { className: `sugestao-container ${tipoClasse}` }, [
    el('div', { className: 'sugestao-titulo', text: 'Sugestão do Sistema' }),
    el('div', { className: 'sugestao-mensagem', text: sugestao.mensagem }),
  ]);
};

export const atualizarModoTrabalhoAtivo = (container) => {
  const trabalhoAtivo = state.trabalhoAtivo;

  setText('trabalhoAtivoTempo', formatarTempoDecorrido(trabalhoAtivo.inicioTurno));
  setText('trabalhoAtivoLucro', formatarMoeda(trabalhoAtivo.lucroAtual));
  setText('trabalhoAtivoGanho', formatarMoeda(trabalhoAtivo.ganhoPorHora));
  setText('trabalhoAtivoMeta', formatarMoeda(trabalhoAtivo.metaDiaria));
  setText('trabalhoAtivoFalta', formatarMoeda(Math.max(0, trabalhoAtivo.faltaParaMeta)));
  setText('trabalhoAtivoPrevisao', formatarMoeda(trabalhoAtivo.previsaoFinal));

  const barra = document.getElementById('trabalhoAtivoBarraProgresso');
  if (barra) {
    const percentual = Math.min(100, Math.max(0, (trabalhoAtivo.lucroAtual / trabalhoAtivo.metaDiaria) * 100));
    barra.style.width = `${percentual}%`;
  }

  const badgeStatus = document.querySelector('.trabalho-badge');
  if (badgeStatus) {
    badgeStatus.className = `trabalho-badge ${trabalhoAtivo.statusMeta}`;
    badgeStatus.textContent = obterTextoStatus(trabalhoAtivo.statusMeta);
  }
};

const formatarTempoDecorrido = (inicioTurno) => {
  if (!inicioTurno) return '00:00';
  const tempoDecorrido = Math.floor((Date.now() - inicioTurno.getTime()) / 60000);
  const horas = Math.floor(tempoDecorrido / 60);
  const minutos = tempoDecorrido % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

const obterTextoStatus = (status) => {
  const statusTextos = {
    'em-progresso': '📊 Em Progresso',
    atingida: '✅ Meta Atingida',
    prejuizo: '⚠️ Em Prejuízo',
  };
  return statusTextos[status] || '❓ Desconhecido';
};

export const aplicarTemasColoresDinamicas = () => {
  const raiz = document.documentElement;
  const { statusMeta, lucroAtual, metaDiaria } = state.trabalhoAtivo;

  const percentual = metaDiaria > 0 ? (lucroAtual / metaDiaria) * 100 : 0;

  if (statusMeta === 'prejudizo' || lucroAtual < 0) {
    raiz.style.setProperty('--cor-dinamica', '#EF4444');
    raiz.style.setProperty('--cor-dinamica-light', '#FEE2E2');
  } else if (statusMeta === 'atingida' || percentual >= 100) {
    raiz.style.setProperty('--cor-dinamica', '#16A34A');
    raiz.style.setProperty('--cor-dinamica-light', '#DCFCE7');
  } else if (percentual >= 75) {
    raiz.style.setProperty('--cor-dinamica', '#EABB08');
    raiz.style.setProperty('--cor-dinamica-light', '#FEF08A');
  } else if (percentual >= 50) {
    raiz.style.setProperty('--cor-dinamica', '#0EA5E9');
    raiz.style.setProperty('--cor-dinamica-light', '#E0F2FE');
  } else {
    raiz.style.setProperty('--cor-dinamica', '#8B5CF6');
    raiz.style.setProperty('--cor-dinamica-light', '#F3E8FF');
  }
};
