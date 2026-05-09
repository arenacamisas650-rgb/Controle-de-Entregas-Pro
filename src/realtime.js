import { state } from './state.js';
import {
  calcularGanhoPorHora,
  calcularPrevisaoFinal,
  calcularFaltaParaMeta,
  calcularProgrecaoMeta,
  gerarSugestao,
  filtrarRotasPorData,
  calcularResumoDia,
  calcularResumoMensal,
  calcularMetaMensal,
  filtrarRotasPorMes,
  filtrarValesPorMes,
  calcularCustoFixoDiario,
  calcularLucro,
  obterMesAnoFiltrado,
  calcularInsightsMotorista,
} from './calculations.js';
import { gerarAlertasAutomaticos, AlertSystem } from './alerts.js';

export class TrabalhoAtivoManager {
  constructor() {
    this.alertSystem = new AlertSystem();
    this.updateInterval = null;
    this.listeners = [];
    this.ultimosAlertas = new Map();
  }

  iniciarTurno(metaDiaria = 0) {
    const agora = new Date();
    state.trabalhoAtivo.ativo = true;
    state.trabalhoAtivo.inicioTurno = agora;
    state.trabalhoAtivo.metaDiaria = Number(metaDiaria) || state.config.metaMensal || 0;
    state.trabalhoAtivo.rotasHoje = [];
    state.trabalhoAtivo.alertas = [];
    state.trabalhoAtivo.statusMeta = 'em-progresso';
    state.trabalhoAtivo.sugestao = null;

    this.iniciarAtualizacaoEmTempoReal();
    this.notificarListeners();
  }

  pararTurno() {
    state.trabalhoAtivo.ativo = false;
    state.trabalhoAtivo.inicioTurno = null;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.alertSystem.limpar();
    this.notificarListeners();
  }

  iniciarAtualizacaoEmTempoReal() {
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      this.atualizarMetricas();
    }, 30000);

    this.atualizarMetricas();
  }

  atualizarMetricas() {
    const { ano, mes } = obterMesAnoFiltrado();
    const hojeISO = new Date().toISOString().slice(0, 10);

    const rotasHoje = filtrarRotasPorData(state.rotas, hojeISO);
    const rotasMes = filtrarRotasPorMes(state.rotas, ano, mes);
    const valesMes = filtrarValesPorMes(state.vales, ano, mes);

    const resumoDia = calcularResumoDia(rotasHoje, ano, mes);
    const resumoMes = calcularResumoMensal(rotasMes, valesMes);
    const meta = calcularMetaMensal(resumoMes.totalLucro, ano, mes);
    const custoDiario = calcularCustoFixoDiario(ano, mes);

    const minutosDecorridos = state.trabalhoAtivo.inicioTurno
      ? Math.floor((Date.now() - state.trabalhoAtivo.inicioTurno.getTime()) / 60000)
      : 0;

    const ganhoPorHora = calcularGanhoPorHora(resumoDia.lucro, minutosDecorridos);
    const previsaoFinal = calcularPrevisaoFinal(resumoDia.lucro, ganhoPorHora, minutosDecorridos);
    const faltaParaMeta = calcularFaltaParaMeta(
      state.trabalhoAtivo.metaDiaria || meta.necessarioPorDia,
      resumoDia.lucro
    );
    const progressao = calcularProgrecaoMeta(
      resumoDia.lucro,
      state.trabalhoAtivo.metaDiaria || meta.necessarioPorDia
    );

    const agora = new Date();
    const horaAtual = agora.getHours() + agora.getMinutes() / 60;
    const horasRestantes = Math.max(0, 18 - horaAtual);

    const emPrejuizo = resumoDia.lucro < custoDiario;
    const metaAtingida = faltaParaMeta <= 0;

    state.trabalhoAtivo.lucroAtual = resumoDia.lucro;
    state.trabalhoAtivo.ganhoPorHora = ganhoPorHora;
    state.trabalhoAtivo.previsaoFinal = previsaoFinal;
    state.trabalhoAtivo.faltaParaMeta = faltaParaMeta;
    state.trabalhoAtivo.rotasHoje = rotasHoje;
    state.trabalhoAtivo.ultimaAtualizacao = agora;

    if (metaAtingida) {
      state.trabalhoAtivo.statusMeta = 'atingida';
    } else if (emPrejuizo) {
      state.trabalhoAtivo.statusMeta = 'prejuizo';
    } else {
      state.trabalhoAtivo.statusMeta = 'em-progresso';
    }

    const insightsMes = calcularInsightsMotorista(rotasMes.length ? rotasMes : state.rotas);
    const mediaHistorica = insightsMes.mediaDiaria || 0;

    const novoAlertas = gerarAlertasAutomaticos({
      lucroAtual: resumoDia.lucro,
      metaDiaria: state.trabalhoAtivo.metaDiaria || meta.necessarioPorDia,
      faltaParaMeta,
      ganhoPorHora,
      custoFixoDiario: custoDiario,
      mediaHistorica,
    });

    novoAlertas.forEach((alerta) => {
      const chave = `${alerta.tipo}-${alerta.titulo}`;
      if (!this.ultimosAlertas.has(chave)) {
        this.alertSystem.adicionar(alerta);
        this.ultimosAlertas.set(chave, true);
      }
    });

    if (novoAlertas.length === 0) {
      this.alertSystem.limpar();
      this.ultimosAlertas.clear();
    }

    state.trabalhoAtivo.alertas = this.alertSystem.obterAtivos();

    const sugestao = gerarSugestao({
      metaAtingida,
      faltaParaMeta,
      ganhoPorHora,
      horasRestantes,
      emPrejuizo,
      previsaoFinal,
      metaDiaria: state.trabalhoAtivo.metaDiaria || meta.necessarioPorDia,
    });

    state.trabalhoAtivo.sugestao = sugestao;

    this.notificarListeners();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notificarListeners() {
    this.listeners.forEach((callback) => callback(state.trabalhoAtivo));
  }

  obterEstado() {
    return { ...state.trabalhoAtivo };
  }

  obterAlertas() {
    return this.alertSystem.obterAtivos();
  }

  removerAlerta(id) {
    this.alertSystem.remover(id);
    state.trabalhoAtivo.alertas = this.alertSystem.obterAtivos();
    this.notificarListeners();
  }
}

export const trabalhoAtivoManager = new TrabalhoAtivoManager();
