export const ALERT_TYPES = {
  SUCESSO: 'sucesso',
  AVISO: 'aviso',
  ERRO: 'erro',
  INFO: 'info',
};

export const ALERT_PRIORITIES = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'critica',
};

export class AlertSystem {
  constructor() {
    this.alertas = [];
    this.historico = [];
    this.listeners = [];
    this.mostrados = new Set();
  }

  adicionar(alerta) {
    const novoAlerta = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...alerta,
    };

    this.alertas.push(novoAlerta);
    this.historico.push(novoAlerta);

    if (this.historico.length > 100) {
      this.historico.shift();
    }

    this.notificarListeners();
    return novoAlerta;
  }

  remover(id) {
    this.alertas = this.alertas.filter((a) => a.id !== id);
    this.notificarListeners();
  }

  limpar() {
    this.alertas = [];
    this.mostrados.clear();
    this.notificarListeners();
  }

  obterAtivos() {
    return [...this.alertas];
  }

  obterPorTipo(tipo) {
    return this.alertas.filter((a) => a.tipo === tipo);
  }

  obterPorPrioridade(prioridade) {
    return this.alertas.filter((a) => a.prioridade === prioridade);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notificarListeners() {
    this.listeners.forEach((callback) => callback(this.alertas));
  }

  marcarComoMostrado(id) {
    this.mostrados.add(id);
  }

  jaFoiMostrado(id) {
    return this.mostrados.has(id);
  }
}

export const gerarAlertaMeta = (faltaParaMeta, metaDiaria, ganhoPorHora) => {
  const meta = Number(metaDiaria || 0);
  const falta = Number(faltaParaMeta || 0);

  if (falta <= 0) {
    return {
      tipo: ALERT_TYPES.SUCESSO,
      prioridade: ALERT_PRIORITIES.ALTA,
      titulo: '🎉 Meta Atingida!',
      mensagem: 'Parabéns! Você atingiu sua meta diária.',
      dados: { faltaParaMeta: 0, metaDiaria: meta },
    };
  }

  if (ganhoPorHora > 0) {
    const horasNecessarias = Math.ceil(falta / ganhoPorHora);
    if (horasNecessarias <= 2) {
      return {
        tipo: ALERT_TYPES.INFO,
        prioridade: ALERT_PRIORITIES.MEDIA,
        titulo: '⏰ Faltam Horas',
        mensagem: `Faltam R$${falta.toFixed(2)} para sua meta. Você consegue em ~${horasNecessarias}h!`,
        dados: { faltaParaMeta: falta, horasNecessarias },
      };
    }
  }

  if (falta < meta * 0.3) {
    return {
      tipo: ALERT_TYPES.AVISO,
      prioridade: ALERT_PRIORITIES.MEDIA,
      titulo: '📊 Puxando para Meta',
      mensagem: `Faltam R$${falta.toFixed(2)} para sua meta. Você está quase lá!`,
      dados: { faltaParaMeta: falta },
    };
  }

  return null;
};

export const gerarAlertaPrejuizo = (lucroAtual, custoFixoDiario) => {
  const lucro = Number(lucroAtual || 0);
  const custo = Number(custoFixoDiario || 0);

  if (lucro < custo) {
    const prejuizo = custo - lucro;
    return {
      tipo: ALERT_TYPES.ERRO,
      prioridade: ALERT_PRIORITIES.CRITICA,
      titulo: '⚠️ Prejuízo Detectado',
      mensagem: `Você está no prejuízo de R$${prejuizo.toFixed(2)}. Aumente o faturamento!`,
      dados: { prejuizo, lucroAtual: lucro, custoFixoDiario: custo },
    };
  }

  return null;
};

export const gerarAlertaPerformance = (ganhoPorHora, mediaHistorica) => {
  const ganho = Number(ganhoPorHora || 0);
  const media = Number(mediaHistorica || 0);

  if (media === 0) return null;

  if (ganho < media * 0.7) {
    return {
      tipo: ALERT_TYPES.AVISO,
      prioridade: ALERT_PRIORITIES.ALTA,
      titulo: '📉 Performance Baixa',
      mensagem: `Seu ganho/hora (R$${ganho.toFixed(2)}) está abaixo da média (R$${media.toFixed(2)}). Aumente a intensidade!`,
      dados: { ganhoPorHora: ganho, mediaHistorica: media },
    };
  }

  if (ganho > media * 1.2) {
    return {
      tipo: ALERT_TYPES.SUCESSO,
      prioridade: ALERT_PRIORITIES.MEDIA,
      titulo: '📈 Excelente Performance',
      mensagem: `Seu ganho/hora (R$${ganho.toFixed(2)}) está 20% acima da média!`,
      dados: { ganhoPorHora: ganho, mediaHistorica: media },
    };
  }

  return null;
};

export const gerarAlertasAutomaticos = (dados) => {
  const {
    lucroAtual = 0,
    metaDiaria = 0,
    faltaParaMeta = 0,
    ganhoPorHora = 0,
    custoFixoDiario = 0,
    mediaHistorica = 0,
  } = dados;

  const alertas = [];

  const alertaMeta = gerarAlertaMeta(faltaParaMeta, metaDiaria, ganhoPorHora);
  if (alertaMeta) alertas.push(alertaMeta);

  const alertaPrejuizo = gerarAlertaPrejuizo(lucroAtual, custoFixoDiario);
  if (alertaPrejuizo) alertas.push(alertaPrejuizo);

  const alertaPerformance = gerarAlertaPerformance(ganhoPorHora, mediaHistorica);
  if (alertaPerformance) alertas.push(alertaPerformance);

  return alertas;
};
