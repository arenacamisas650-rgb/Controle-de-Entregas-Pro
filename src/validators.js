export const toNumber = (value, fallback = 0) => {
  const n = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};
export const toNonNegative = (value, fallback = 0) => Math.max(0, toNumber(value, fallback));
export const toInteger = (value, fallback = 0) => Math.max(0, Math.trunc(toNumber(value, fallback)));
export const sanitizeText = (value, max = 120) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const normalizeDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? String(value) : new Date().toISOString().slice(0, 10));
export const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const normalizeUuid = (value) => sanitizeText(value, 80);
export const normalizeId = (value) => {
  const id = sanitizeText(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : createId();
};

export const validateConfig = (input = {}) => ({
  custoPorKm: toNonNegative(input.custoPorKm),
  consumoVeiculo: input.consumoVeiculo === '' ? '' : toNonNegative(input.consumoVeiculo),
  precoCombustivel: input.precoCombustivel === '' ? '' : toNonNegative(input.precoCombustivel),
  custoPorKmIncluiCombustivel: Boolean(input.custoPorKmIncluiCombustivel),
  metaMensal: toNonNegative(input.metaMensal),
  parcelaCarro: toNonNegative(input.parcelaCarro),
  seguroMensal: toNonNegative(input.seguroMensal),
  manutencaoMensal: toNonNegative(input.manutencaoMensal),
});

export const validateRoute = (input = {}) => {
  const empresa = sanitizeText(input.empresa, 80);
  const valor = toNonNegative(input.valor);
  if (!empresa) throw new Error('Informe a empresa da rota.');
  if (valor <= 0) throw new Error('Informe um valor de rota maior que zero.');
  return {
    id: input.id ? normalizeId(input.id) : createId(),
    userId: input.userId || input.user_id ? normalizeUuid(input.userId || input.user_id) : '',
    data: normalizeDate(input.data),
    empresa,
    valor,
    km: toNonNegative(input.km),
    duracao: toInteger(input.duracao),
    qtdEntregas: toInteger(input.qtdEntregas),
    consumoVeiculo: input.consumoVeiculo === '' ? '' : toNonNegative(input.consumoVeiculo),
    precoCombustivel: input.precoCombustivel === '' ? '' : toNonNegative(input.precoCombustivel),
    custoPorKm: toNonNegative(input.custoPorKm),
    custoPorKmIncluiCombustivel: Boolean(input.custoPorKmIncluiCombustivel),
    ajudante: toNonNegative(input.ajudante),
    outros: toNonNegative(input.outros),
    createdAt: input.createdAt || input.created_at || new Date().toISOString(),
    updatedAt: input.updatedAt || input.updated_at || new Date().toISOString(),
    deletedAt: input.deletedAt || input.deleted_at || null,
  };
};

export const validateVale = (input = {}) => {
  const valorVale = toNonNegative(input.valorVale);
  if (valorVale <= 0) throw new Error('Informe um valor de vale maior que zero.');
  return { id: input.id ? normalizeId(input.id) : createId(), userId: input.userId || input.user_id ? normalizeUuid(input.userId || input.user_id) : '', dataVale: normalizeDate(input.dataVale || input.data_vale), valorVale, descricao: sanitizeText(input.descricao, 120), createdAt: input.createdAt || input.created_at || new Date().toISOString(), updatedAt: input.updatedAt || input.updated_at || new Date().toISOString(), deletedAt: input.deletedAt || input.deleted_at || null };
};

export const validatePaymentKey = (value) => {
  const key = sanitizeText(value, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Chave de pagamento invalida.');
  return key;
};

export const validateImportPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Arquivo de backup invalido.');
  const rawConfig = payload.config || payload.configuracoes || {};
  return {
    rotas: Array.isArray(payload.rotas) ? payload.rotas.map(validateRoute) : [],
    vales: Array.isArray(payload.vales) ? payload.vales.map(validateVale) : [],
    pagamentos: Array.isArray(payload.pagamentosAjudanteFeitos || payload.pagamentos) ? (payload.pagamentosAjudanteFeitos || payload.pagamentos).map(validatePaymentKey) : [],
    config: validateConfig({
      custoPorKm: rawConfig.custoPorKm ?? rawConfig.custoPorKmSalvo ?? 0,
      consumoVeiculo: rawConfig.consumoVeiculo ?? rawConfig.consumoVeiculoSalvo ?? '',
      precoCombustivel: rawConfig.precoCombustivel ?? rawConfig.precoCombustivelSalvo ?? '',
      custoPorKmIncluiCombustivel: rawConfig.custoPorKmIncluiCombustivel ?? false,
      metaMensal: rawConfig.metaMensal ?? 0,
      parcelaCarro: rawConfig.parcelaCarro ?? 0,
      seguroMensal: rawConfig.seguroMensal ?? 0,
      manutencaoMensal: rawConfig.manutencaoMensal ?? 0,
    }),
    empresas: Array.isArray(payload.empresas) ? payload.empresas.map((e) => sanitizeText(e, 80)).filter(Boolean) : [],
  };
};
