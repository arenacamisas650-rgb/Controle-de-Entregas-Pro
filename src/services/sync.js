import { state } from '../state.js';
import { DB } from '../storage.js';
import { api } from './api.js';

const MAX_ATTEMPTS = 5;

export const queueSync = async (path, payload, method = 'POST') => {
  const operationId = crypto.randomUUID();
  const item = {
    id: operationId,
    operationId,
    path,
    method,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  if (!state.sync.pendentes.some((pending) => pending.id === item.id)) {
    state.sync.pendentes.push(item);
  }
  await DB.save('syncQueue', item);
  console.log('[Sync] Item enfileirado:', { path, operationId, attempts: 0 });
  return item;
};

export const syncNow = async () => {
  if (!navigator.onLine) {
    console.log('[Sync] Offline - sincronização adiada');
    state.sync.status = 'offline';
    return { sent: 0 };
  }
  
  if (state.sync.syncing) {
    console.log('[Sync] Já está sincronizando');
    return { sent: 0 };
  }
  
  if (!state.auth.user?.id) {
    console.warn('[Sync] Nenhum usuário autenticado');
    return { sent: 0 };
  }

  if (state.auth.user.id === 'offline-user') {
    console.log('[Sync] Autenticação desativada - sincronização remota ignorada');
    state.sync.status = navigator.onLine ? 'online' : 'offline';
    return { sent: 0 };
  }
  
  if (!api.isConfigured()) {
    console.warn('[Sync] Supabase não está configurado');
    return { sent: 0 };
  }

  state.sync.syncing = true;
  state.loading.sync = true;
  state.sync.status = 'syncing';
  const remaining = [];
  let sent = 0;

  console.log('[Sync] Iniciando sincronização com', state.sync.pendentes.length, 'items');

  for (const item of state.sync.pendentes) {
    try {
      if (item.method === 'POST') {
        await api.post(item.path, item.payload, { operationId: item.operationId });
      }
      await DB.remove('syncQueue', item.id);
      sent += 1;
      console.log('[Sync] Item sincronizado com sucesso:', item.operationId);
    } catch (error) {
      const nextAttempts = (item.attempts || 0) + 1;
      const next = {
        ...item,
        attempts: nextAttempts,
        lastError: error.message,
        lastAttemptAt: new Date().toISOString(),
      };
      
      console.error('[Sync] Erro ao sincronizar item:', {
        operationId: item.operationId,
        tentativa: nextAttempts,
        erro: error.message,
        retentando: nextAttempts < MAX_ATTEMPTS,
      });
      
      if (nextAttempts < MAX_ATTEMPTS) {
        remaining.push(next);
        await DB.save('syncQueue', next);
      } else {
        console.error('[Sync] Item descartado após', MAX_ATTEMPTS, 'tentativas:', item.operationId);
        await DB.remove('syncQueue', item.id);
      }
    }
  }

  state.sync.pendentes = remaining;
  state.sync.lastSyncAt = new Date().toISOString();
  state.sync.syncing = false;
  state.loading.sync = false;
  state.sync.status = 'online';
  
  console.log('[Sync] Sincronização concluída:', {
    enviados: sent,
    restantes: remaining.length,
    timestamp: state.sync.lastSyncAt,
  });
  
  return { sent };
};

export const scheduleSync = (notify) => {
  const update = () => {
    state.sync.status = navigator.onLine ? 'online' : 'offline';
    console.log('[Sync] Status:', state.sync.status);
    notify?.();
    if (navigator.onLine) {
      syncNow().then(notify).catch((error) => {
        console.error('[Sync] Erro na sincronização programada:', error.message);
        notify?.();
      });
    }
  };
  
  window.addEventListener('online', () => {
    console.log('[Sync] Aplicação voltou online');
    update();
  });
  
  window.addEventListener('offline', () => {
    console.log('[Sync] Aplicação ficou offline');
    update();
  });
  
  // Sincronizar a cada 30 segundos quando online
  const interval = setInterval(() => {
    if (navigator.onLine && state.sync.pendentes.length > 0) {
      console.log('[Sync] Sincronização periódica (30s)');
      syncNow().then(notify).catch((error) => {
        console.error('[Sync] Erro na sincronização periódica:', error.message);
      });
    }
  }, 30000);
  
  console.log('[Sync] Sincronização programada - intervalo de 30s');
  update();
  
  // Limpar intervalo se necessário (para hot reload)
  if (window.syncInterval) clearInterval(window.syncInterval);
  window.syncInterval = interval;
};
