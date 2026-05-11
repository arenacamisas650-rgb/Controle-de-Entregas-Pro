import { state } from './state.js';

export const formatarMoeda = (value) => (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : '--');
export const obterMesAnoFiltrado = () => {
  if (state.ui.mesFiltrado) {
    const [ano, mes] = state.ui.mesFiltrado.split('-').map(Number);
    return { ano, mes: mes - 1 };
  }
  const h = new Date();
  return { ano: h.getFullYear(), mes: h.getMonth() };
};
export const calcularGastoCombustivel = (r) => {
  if (r.custoPorKmIncluiCombustivel) return 0;
  const km = Number(r.km || 0), consumo = Number(r.consumoVeiculo || state.config.consumoVeiculo || 0), preco = Number(r.precoCombustivel || state.config.precoCombustivel || 0);
  return km && consumo && preco ? (km / consumo) * preco : 0;
};
export const calcularCustoKm = (r) => Number(r.km || 0) * Number(r.custoPorKm ?? state.config.custoPorKm ?? 0);
export const calcularCustosVariaveis = (r) => ({
  combustivel: calcularGastoCombustivel(r),
  manutencaoKm: calcularCustoKm(r),
  ajudante: Number(r.ajudante || 0),
  outros: Number(r.outros || 0),
});
export const somarCustosVariaveis = (r) => {
  const c = calcularCustosVariaveis(r);
  return c.combustivel + c.manutencaoKm + c.ajudante + c.outros;
};
export const calcularGasto = (r) => calcularGastoCombustivel(r) + calcularCustoKm(r);
export const calcularLucro = (r) => Number(r.valor || 0) - somarCustosVariaveis(r);
export const calcularCustosFixosMensais = (config = state.config) => (
  Number(config.parcelaCarro || 0) + Number(config.seguroMensal || 0) + Number(config.manutencaoMensal || 0)
);
export const calcularCustoFixoDiario = (ano, mes, config = state.config) => {
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  return diasNoMes > 0 ? calcularCustosFixosMensais(config) / diasNoMes : 0;
};
export const calcularLucroLiquidoReal = (rotas, ano, mes, config = state.config) => (
  rotas.reduce((a, r) => a + calcularLucro(r), 0) - calcularCustosFixosMensais(config)
);
export const calcularPerformance = (rotas) => {
  const lucro = rotas.reduce((a, r) => a + calcularLucro(r), 0), min = rotas.reduce((a, r) => a + Number(r.duracao || 0), 0), ent = rotas.reduce((a, r) => a + Number(r.qtdEntregas || 0), 0), horas = min / 60;
  return { lucroHora: horas > 0 ? lucro / horas : null, entregasHora: horas > 0 && ent > 0 ? ent / horas : null, valorEntrega: ent > 0 ? lucro / ent : null };
};
export const filtrarRotasPorMes = (rotas, ano, mes) => rotas.filter((r) => { const d = new Date(`${r.data}T00:00:00`); return d.getFullYear() === ano && d.getMonth() === mes; });
export const filtrarValesPorMes = (vales, ano, mes) => vales.filter((v) => { const d = new Date(`${v.dataVale}T00:00:00`); return d.getFullYear() === ano && d.getMonth() === mes; });
export const calcularResumoMensal = (rotas, vales) => {
  const totalFaturado = rotas.reduce((a, r) => a + Number(r.valor || 0), 0);
  const combustivel = rotas.reduce((a, r) => a + calcularGastoCombustivel(r), 0);
  const manutencaoKm = rotas.reduce((a, r) => a + calcularCustoKm(r), 0);
  const ajudante = rotas.reduce((a, r) => a + Number(r.ajudante || 0), 0);
  const outros = rotas.reduce((a, r) => a + Number(r.outros || 0), 0);
  const custosVariaveis = combustivel + manutencaoKm + ajudante + outros;
  const custosFixos = calcularCustosFixosMensais();
  const totalGastos = custosVariaveis + custosFixos;
  const lucroOperacional = totalFaturado - custosVariaveis;
  const totalLucro = totalFaturado - totalGastos;
  const totalVales = vales.reduce((a, v) => a + Number(v.valorVale || 0), 0);
  const kmTotal = rotas.reduce((a, r) => a + Number(r.km || 0), 0);
  const entregasTotal = rotas.reduce((a, r) => a + Number(r.qtdEntregas || 0), 0);
  return {
    totalFaturado,
    combustivel,
    manutencaoKm,
    ajudante,
    outros,
    custosVariaveis,
    custosFixos,
    totalGastos,
    lucroOperacional,
    totalLucro,
    totalVales,
    saldo: totalLucro - totalVales,
    kmTotal,
    entregasTotal,
    eficienciaKm: kmTotal > 0 ? totalLucro / kmTotal : null,
    ganhoMedioEntrega: entregasTotal > 0 ? totalFaturado / entregasTotal : null,
    custoPorEntrega: entregasTotal > 0 ? totalGastos / entregasTotal : null,
    lucroPorEntrega: entregasTotal > 0 ? totalLucro / entregasTotal : null,
  };
};
export const projetarMesPorDiasTrabalhados = (rotasMes, ano, mes) => {
  const lucro = rotasMes.reduce((a, r) => a + calcularLucro(r), 0), dias = new Set(rotasMes.map((r) => r.data));
  if (!dias.size) return 0;
  const diasSemana = new Set([...dias].map((d) => new Date(`${d}T00:00:00`).getDay()));
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  let projetados = 0;
  for (let d = 1; d <= diasNoMes; d += 1) if (diasSemana.has(new Date(ano, mes, d).getDay())) projetados += 1;
  return (lucro / dias.size) * projetados;
};

export const filtrarRotasPorData = (rotas, dateISO) => rotas.filter((r) => r.data === dateISO);

export const calcularResumoDia = (rotasDia, ano, mes) => {
  const bruto = rotasDia.reduce((a, r) => a + Number(r.valor || 0), 0);
  const variaveis = rotasDia.reduce((a, r) => a + somarCustosVariaveis(r), 0);
  const fixoDia = calcularCustoFixoDiario(ano, mes);
  const km = rotasDia.reduce((a, r) => a + Number(r.km || 0), 0);
  const entregas = rotasDia.reduce((a, r) => a + Number(r.qtdEntregas || 0), 0);
  const custoTotal = variaveis + fixoDia;
  const lucro = bruto - custoTotal;
  return {
    bruto,
    variaveis,
    fixoDia,
    custoTotal,
    lucro,
    km,
    entregas,
    eficienciaKm: km > 0 ? lucro / km : null,
    ganhoMedioEntrega: entregas > 0 ? bruto / entregas : null,
    custoPorEntrega: entregas > 0 ? custoTotal / entregas : null,
    lucroPorEntrega: entregas > 0 ? lucro / entregas : null,
  };
};

export const calcularMetaMensal = (lucroMes, ano, mes, config = state.config) => {
  const metaMensal = Number(config.metaMensal || 0);
  const hoje = new Date();
  const isMesAtual = hoje.getFullYear() === ano && hoje.getMonth() === mes;
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diaBase = isMesAtual ? hoje.getDate() : diasNoMes;
  const diasRestantes = Math.max(0, diasNoMes - diaBase + (isMesAtual ? 1 : 0));
  const falta = Math.max(0, metaMensal - lucroMes);
  return {
    metaMensal,
    realizado: lucroMes,
    falta,
    progresso: metaMensal > 0 ? Math.min(100, (lucroMes / metaMensal) * 100) : 0,
    diasRestantes,
    necessarioPorDia: diasRestantes > 0 ? falta / diasRestantes : falta,
  };
};

export const calcularPlanoDoDia = ({
  lucroHoje = 0,
  metaDiaria = 0,
  custoFixoDiario = 0,
  ganhoPorEntrega = 0,
  ganhoPorKm = 0,
} = {}) => {
  const metaHoje = Math.max(Number(metaDiaria || 0), Number(custoFixoDiario || 0));
  const restante = Math.max(0, metaHoje - Number(lucroHoje || 0));
  const entregaBase = Math.max(0, Number(ganhoPorEntrega || 0));
  const kmBase = Math.max(0, Number(ganhoPorKm || 0));

  return {
    metaHoje,
    minimoSemPrejuizo: Number(custoFixoDiario || 0),
    restante,
    lucroHoje: Number(lucroHoje || 0),
    entregasNecessarias: entregaBase > 0 ? Math.ceil(restante / entregaBase) : 0,
    kmNecessario: kmBase > 0 ? Math.ceil(restante / kmBase) : 0,
    ganhoPorEntrega: entregaBase,
    ganhoPorKm: kmBase,
    metaAtingida: Number(lucroHoje || 0) >= metaHoje,
    emPrejuizo: Number(lucroHoje || 0) < Number(custoFixoDiario || 0),
  };
};

export const calcularGanhoPorHora = (lucroAcumulado, minutosDecorridos) => {
  const horas = Math.max(1, minutosDecorridos / 60);
  return Math.max(0, lucroAcumulado / horas);
};

export const calcularPrevisaoFinal = (lucroAtual, ganhoPorHora, minutosDecorridos, horaFimTurno = 18) => {
  const agora = new Date();
  const horaAtual = agora.getHours() + agora.getMinutes() / 60;
  const horasRestantes = Math.max(0, horaFimTurno - horaAtual);
  const lucroPrevistoRestante = ganhoPorHora * horasRestantes;
  return lucroAtual + lucroPrevistoRestante;
};

export const calcularFaltaParaMeta = (metaDiaria, lucroAtual) => {
  const falta = Math.max(0, Number(metaDiaria || 0) - Number(lucroAtual || 0));
  return falta;
};

export const calcularProgrecaoMeta = (lucroAtual, metaDiaria) => {
  const meta = Number(metaDiaria || 0);
  return meta > 0 ? Math.min(100, (Number(lucroAtual || 0) / meta) * 100) : 0;
};

export const gerarSugestao = ({
  metaAtingida = false,
  faltaParaMeta = 0,
  ganhoPorHora = 0,
  horasRestantes = 0,
  emPrejuizo = false,
  previsaoFinal = 0,
  metaDiaria = 0,
} = {}) => {
  if (emPrejuizo) return { tipo: 'aviso', mensagem: '⚠️ Você está em prejuízo hoje. Não recomendamos parar agora.' };
  if (metaAtingida) return { tipo: 'sucesso', mensagem: '✅ Meta atingida! Bom trabalho. Pode parar quando quiser.' };
  if (ganhoPorHora > 0 && horasRestantes > 0) {
    const horasNecessarias = Math.ceil(faltaParaMeta / ganhoPorHora);
    if (horasNecessarias <= horasRestantes) {
      return { tipo: 'info', mensagem: `📊 Você consegue bater a meta em ~${horasNecessarias}h. Continue!` };
    }
  }
  if (previsaoFinal < metaDiaria * 0.8) {
    return { tipo: 'aviso', mensagem: '⚠️ Difícil bater a meta com este ritmo. Aumente a intensidade!' };
  }
  return { tipo: 'info', mensagem: '📈 Ritmo bom! Continue trabalhando.' };
};

export const calcularInsightsMotorista = (rotas) => {
  const nomes = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  const porDiaSemana = nomes.map((nome) => ({ nome, total: 0, count: 0, media: 0 }));
  const porData = new Map();

  rotas.forEach((r) => {
    const lucro = calcularLucro(r);
    const diaSemana = new Date(`${r.data}T00:00:00`).getDay();
    porDiaSemana[diaSemana].total += lucro;
    porDiaSemana[diaSemana].count += 1;
    porData.set(r.data, (porData.get(r.data) || 0) + lucro);
  });

  porDiaSemana.forEach((d) => { d.media = d.count > 0 ? d.total / d.count : 0; });
  const diasComDados = porDiaSemana.filter((d) => d.count > 0);
  const melhorDia = diasComDados.length ? [...diasComDados].sort((a, b) => b.media - a.media)[0] : null;
  const piorDia = diasComDados.length ? [...diasComDados].sort((a, b) => a.media - b.media)[0] : null;
  const mediaDiaria = porData.size ? [...porData.values()].reduce((a, v) => a + v, 0) / porData.size : 0;

  return {
    melhorDia,
    piorDia,
    mediaDiaria,
    sugestaoMetaDiaria: mediaDiaria > 0 ? mediaDiaria * 1.1 : 0,
    porDiaSemana,
  };
};

export const calcularPerformancePeriodo = (rotas, { ano, mes } = {}) => {
  if (!rotas.length) {
    return {
      totalLucro: 0,
      totalKm: 0,
      totalHoras: 0,
      totalEntregas: 0,
      mediaDiaria: 0,
      ganhoPorHora: 0,
      ganhoPorKm: 0,
      diasMap: {},
      diasTrabalhados: 0,
      ganhoPorEntrega: 0,
    };
  }

  const rotasFiltered = ano && mes !== undefined ? filtrarRotasPorMes(rotas, ano, mes) : rotas;
  
  const diasMap = {};
  let totalLucro = 0;
  let totalKm = 0;
  let totalHoras = 0;
  let totalEntregas = 0;

  rotasFiltered.forEach((rota) => {
    const lucro = calcularLucro(rota);
    const km = Number(rota.km || 0);
    const horas = Number(rota.duracao || 0) / 60;
    const entregas = Number(rota.qtdEntregas || 0);

    if (!diasMap[rota.data]) {
      diasMap[rota.data] = { lucro: 0, km: 0, horas: 0, entregas: 0, rotas: 0 };
    }

    diasMap[rota.data].lucro += lucro;
    diasMap[rota.data].km += km;
    diasMap[rota.data].horas += horas;
    diasMap[rota.data].entregas += entregas;
    diasMap[rota.data].rotas += 1;

    totalLucro += lucro;
    totalKm += km;
    totalHoras += horas;
    totalEntregas += entregas;
  });

  const diasTrabalhados = Object.keys(diasMap).length;
  const ganhoPorHora = totalHoras > 0 ? totalLucro / totalHoras : 0;
  const ganhoPorKm = totalKm > 0 ? totalLucro / totalKm : 0;
  const mediaDiaria = diasTrabalhados > 0 ? totalLucro / diasTrabalhados : 0;
  const ganhoPorEntrega = totalEntregas > 0 ? totalLucro / totalEntregas : 0;

  return {
    totalLucro,
    totalKm,
    totalHoras,
    totalEntregas,
    mediaDiaria,
    ganhoPorHora,
    ganhoPorKm,
    ganhoPorEntrega,
    diasMap,
    diasTrabalhados,
  };
};

export const calcularPerformanceSemanal = (rotas) => {
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const porDia = Array(7).fill(null).map((_, i) => ({
    dia: i,
    nome: nomes[i],
    total: 0,
    count: 0,
    km: 0,
    horas: 0,
    entregas: 0,
  }));

  rotas.forEach((rota) => {
    const diaSemana = new Date(`${rota.data}T00:00:00`).getDay();
    const lucro = calcularLucro(rota);
    const km = Number(rota.km || 0);
    const horas = Number(rota.duracao || 0) / 60;
    const entregas = Number(rota.qtdEntregas || 0);

    porDia[diaSemana].total += lucro;
    porDia[diaSemana].count += 1;
    porDia[diaSemana].km += km;
    porDia[diaSemana].horas += horas;
    porDia[diaSemana].entregas += entregas;
  });

  porDia.forEach((d) => {
    d.media = d.count > 0 ? d.total / d.count : 0;
    d.ganhoPorHora = d.horas > 0 ? d.total / d.horas : 0;
    d.ganhoPorKm = d.km > 0 ? d.total / d.km : 0;
  });

  return porDia;
};

export const calcularMelhorEPiorDia = (diasSemana) => {
  const diasComDados = diasSemana.filter((d) => d.count > 0);
  
  if (!diasComDados.length) {
    return { melhorDia: null, piorDia: null };
  }

  const melhorDia = diasComDados.reduce((a, b) => (a.media > b.media ? a : b));
  const piorDia = diasComDados.reduce((a, b) => (a.media < b.media ? a : b));

  return { melhorDia, piorDia };
};

export const gerarInsightsPerformance = (performance, config = state.config) => {
  const insights = [];
  const metaDiaria = (Number(config.metaMensal || 0) / 30) || 0;
  const ganhoPorHoraMinimo = 30;

  if (performance.mediaDiaria < metaDiaria && performance.mediaDiaria > 0) {
    insights.push({
      tipo: 'aviso',
      titulo: '📊 Abaixo da Meta',
      mensagem: `Sua média diária (R$${performance.mediaDiaria.toFixed(2)}) está abaixo da meta (R$${metaDiaria.toFixed(2)})`,
      prioridade: 'alta',
    });
  }

  if (performance.ganhoPorHora > 0 && performance.ganhoPorHora < ganhoPorHoraMinimo) {
    insights.push({
      tipo: 'aviso',
      titulo: '⏰ Ganho/Hora Baixo',
      mensagem: `Seu ganho/hora (R$${performance.ganhoPorHora.toFixed(2)}) está abaixo do recomendado (R$${ganhoPorHoraMinimo})`,
      prioridade: 'media',
    });
  }

  if (performance.totalKm > 0) {
    const kmMedio = performance.totalKm / performance.diasTrabalhados;
    if (kmMedio > 200) {
      insights.push({
        tipo: 'info',
        titulo: '📍 Distância Alta',
        mensagem: `Você tem rodado em média ${kmMedio.toFixed(0)}km por dia. Considere otimizar as rotas.`,
        prioridade: 'media',
      });
    }
  }

  if (performance.ganhoPorEntrega > 0) {
    const lucroMedioEsperado = metaDiaria / 10;
    if (performance.ganhoPorEntrega > lucroMedioEsperado * 1.2) {
      insights.push({
        tipo: 'sucesso',
        titulo: '💰 Ganho Alto por Entrega',
        mensagem: `Sua média por entrega (R$${performance.ganhoPorEntrega.toFixed(2)}) está acima do esperado!`,
        prioridade: 'media',
      });
    }
  }

  return insights;
};
