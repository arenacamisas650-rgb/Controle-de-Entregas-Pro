import { SUPABASE_CONFIG } from '../config.js';

export const isSupabaseConfigured = () => {
  const configured = (
    SUPABASE_CONFIG.url.startsWith('https://')
    && !SUPABASE_CONFIG.url.includes('SEU-PROJETO')
    && SUPABASE_CONFIG.anonKey
    && !SUPABASE_CONFIG.anonKey.includes('SUA_SUPABASE')
  );
  
  if (!configured) {
    console.error('[Supabase] Configuração incompleta', {
      url: SUPABASE_CONFIG.url,
      anonKeyConfigured: !!SUPABASE_CONFIG.anonKey,
    });
  }
  return configured;
};

export const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    const err = new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY em src/config.js.');
    console.error('[Supabase] ' + err.message);
    throw err;
  }
  
  if (!window.supabase?.createClient) {
    const err = new Error('Cliente Supabase não foi carregado. Verifique se a biblioteca está no index.html');
    console.error('[Supabase] ' + err.message);
    throw err;
  }
  
  if (!window.entregaProSupabase) {
    try {
      console.log('[Supabase] Inicializando cliente com URL:', SUPABASE_CONFIG.url);
      window.entregaProSupabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      );
      console.log('[Supabase] Cliente inicializado com sucesso');
    } catch (error) {
      console.error('[Supabase] Erro ao criar cliente:', error);
      throw error;
    }
  }
  
  return window.entregaProSupabase;
};
