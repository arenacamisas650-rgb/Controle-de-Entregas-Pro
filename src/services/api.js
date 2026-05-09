import { state } from '../state.js';
import { validateRoute, validateVale } from '../validators.js';
import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';

const requireUser = () => {
  const user = state.auth.user;
  if (!user?.id) {
    const err = new Error('Faça login para sincronizar com o Supabase.');
    console.error('[API] ' + err.message);
    throw err;
  }
  console.debug('[API] Usuário autenticado:', user.id);
  return user;
};

const routeToRow = (route, operationId = null) => ({
  id: route.id,
  user_id: route.userId || route.user_id || requireUser().id,
  data: route.data,
  empresa: route.empresa,
  valor: route.valor,
  km: route.km,
  duracao: route.duracao,
  qtd_entregas: route.qtdEntregas,
  consumo_veiculo: Number(route.consumoVeiculo || 0),
  preco_combustivel: Number(route.precoCombustivel || 0),
  custo_por_km: route.custoPorKm,
  custo_por_km_inclui_combustivel: route.custoPorKmIncluiCombustivel,
  ajudante: route.ajudante,
  outros: route.outros,
  sync_operation_id: operationId,
  deleted_at: route.deletedAt || null,
  created_at: route.createdAt,
  updated_at: route.updatedAt || new Date().toISOString(),
});

const rowToRoute = (row) => validateRoute({
  id: row.id,
  userId: row.user_id,
  data: row.data,
  empresa: row.empresa,
  valor: row.valor,
  km: row.km,
  duracao: row.duracao,
  qtdEntregas: row.qtd_entregas,
  consumoVeiculo: row.consumo_veiculo,
  precoCombustivel: row.preco_combustivel,
  custoPorKm: row.custo_por_km,
  custoPorKmIncluiCombustivel: row.custo_por_km_inclui_combustivel,
  ajudante: row.ajudante,
  outros: row.outros,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const valeToRow = (vale, operationId = null) => ({
  id: vale.id,
  user_id: vale.userId || vale.user_id || requireUser().id,
  data_vale: vale.dataVale,
  valor_vale: vale.valorVale,
  descricao: vale.descricao,
  sync_operation_id: operationId,
  deleted_at: vale.deletedAt || null,
  created_at: vale.createdAt,
  updated_at: vale.updatedAt || new Date().toISOString(),
});

const rowToVale = (row) => validateVale({
  id: row.id,
  userId: row.user_id,
  dataVale: row.data_vale,
  valorVale: row.valor_vale,
  descricao: row.descricao,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const newestById = (localItems, remoteItems) => {
  const merged = new Map();
  [...localItems, ...remoteItems].forEach((item) => {
    const prev = merged.get(item.id);
    if (!prev || new Date(item.updatedAt || 0) >= new Date(prev.updatedAt || 0)) merged.set(item.id, item);
  });
  return [...merged.values()].filter((item) => !item.deletedAt);
};

export const api = {
  isConfigured: isSupabaseConfigured,

  async post(path, payload, options = {}) {
    try {
      if (path === '/rotas') return this.salvarRota(payload, options.operationId);
      if (path === '/rotas/delete') return this.deletarRota(payload.id, options.operationId);
      if (path === '/vales') return this.salvarVale(payload, options.operationId);
      if (path === '/vales/delete') return this.deletarVale(payload.id, options.operationId);
      if (path.startsWith('/nuvemshop')) {
        console.log('[API] Nuvemshop desabilitado - simulando sucesso');
        return { ok: true, prepared: true };
      }
      const err = new Error(`Endpoint não implementado: ${path}`);
      console.error('[API] ' + err.message);
      throw err;
    } catch (error) {
      console.error('[API] Erro no POST:', { path, error: error.message });
      throw error;
    }
  },

  async get(path) {
    try {
      if (path === '/rotas') return this.buscarRotas();
      if (path === '/vales') return this.buscarVales();
      const err = new Error(`Endpoint não implementado: ${path}`);
      console.error('[API] ' + err.message);
      throw err;
    } catch (error) {
      console.error('[API] Erro no GET:', { path, error: error.message });
      throw error;
    }
  },

  async salvarRota(route, operationId = null) {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para sincronizar rota.');
      
      const supabase = getSupabase();
      const user = requireUser();
      const safe = validateRoute({ ...route, userId: route.userId || user.id });
      
      console.log('[API] Salvando rota:', { id: safe.id, user_id: user.id, operationId, data: safe.data });
      
      const { data, error } = await supabase
        .from('rotas')
        .upsert(routeToRow(safe, operationId), { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        console.error('[API] Erro ao salvar rota:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Rota salva com sucesso:', data.id);
      return rowToRoute(data);
    } catch (error) {
      console.error('[API] Falha ao salvar rota:', error.message);
      throw error;
    }
  },

  async buscarRotas() {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para buscar rotas.');
      
      const supabase = getSupabase();
      const user = requireUser();
      
      console.log('[API] Buscando rotas para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('rotas')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[API] Erro ao buscar rotas:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Rotas recuperadas:', data.length);
      return data.map(rowToRoute);
    } catch (error) {
      console.error('[API] Falha ao buscar rotas:', error.message);
      throw error;
    }
  },

  async deletarRota(id, operationId = null) {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para deletar rota.');
      
      const supabase = getSupabase();
      const user = requireUser();
      
      console.log('[API] Deletando rota:', { id, user_id: user.id, operationId });
      
      const { error } = await supabase
        .from('rotas')
        .update({ 
          deleted_at: new Date().toISOString(), 
          updated_at: new Date().toISOString(), 
          sync_operation_id: operationId 
        })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[API] Erro ao deletar rota:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Rota deletada com sucesso:', id);
      return { id };
    } catch (error) {
      console.error('[API] Falha ao deletar rota:', error.message);
      throw error;
    }
  },

  async salvarVale(vale, operationId = null) {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para sincronizar vale.');
      
      const supabase = getSupabase();
      const user = requireUser();
      const safe = validateVale({ ...vale, userId: vale.userId || user.id });
      
      console.log('[API] Salvando vale:', { id: safe.id, user_id: user.id, operationId, dataVale: safe.dataVale });
      
      const { data, error } = await supabase
        .from('vales')
        .upsert(valeToRow(safe, operationId), { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        console.error('[API] Erro ao salvar vale:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Vale salvo com sucesso:', data.id);
      return rowToVale(data);
    } catch (error) {
      console.error('[API] Falha ao salvar vale:', error.message);
      throw error;
    }
  },

  async buscarVales() {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para buscar vales.');
      
      const supabase = getSupabase();
      const user = requireUser();
      
      console.log('[API] Buscando vales para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('vales')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[API] Erro ao buscar vales:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Vales recuperados:', data.length);
      return data.map(rowToVale);
    } catch (error) {
      console.error('[API] Falha ao buscar vales:', error.message);
      throw error;
    }
  },

  async deletarVale(id, operationId = null) {
    try {
      if (!navigator.onLine) throw new Error('Sem conexão para deletar vale.');
      
      const supabase = getSupabase();
      const user = requireUser();
      
      console.log('[API] Deletando vale:', { id, user_id: user.id, operationId });
      
      const { error } = await supabase
        .from('vales')
        .update({ 
          deleted_at: new Date().toISOString(), 
          updated_at: new Date().toISOString(), 
          sync_operation_id: operationId 
        })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[API] Erro ao deletar vale:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      
      console.log('[API] Vale deletado com sucesso:', id);
      return { id };
    } catch (error) {
      console.error('[API] Falha ao deletar vale:', error.message);
      throw error;
    }
  },

  mergeLastWriteWins: newestById,
};
