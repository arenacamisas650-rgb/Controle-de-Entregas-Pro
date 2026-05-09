import { state } from '../state.js';
import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';

export const auth = {
  async init(onChange) {
    state.auth.configured = isSupabaseConfigured();
    if (!state.auth.configured) {
      console.warn('[Auth] Supabase não configurado');
      state.auth.loading = false;
      onChange?.();
      return null;
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth] Erro ao recuperar sessão:', error);
        throw error;
      }
      state.auth.session = data.session;
      state.auth.user = data.session?.user || null;
      state.auth.loading = false;
      console.log('[Auth] Sessão recuperada:', state.auth.user?.id);

      supabase.auth.onAuthStateChange((event, session) => {
        state.auth.session = session;
        state.auth.user = session?.user || null;
        state.auth.event = event;
        console.log('[Auth] Mudança de autenticação:', event, 'user:', session?.user?.id);
        setTimeout(() => onChange?.(event, session), 0);
      });

      return data.session;
    } catch (error) {
      console.error('[Auth] Erro na inicialização:', error.message);
      state.auth.loading = false;
      state.auth.configured = false;
      onChange?.();
      throw error;
    }
  },

  async login(email, password) {
    try {
      const supabase = getSupabase();
      console.log('[Auth] Tentando login com email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Auth] Erro de login:', error.message);
        throw error;
      }
      state.auth.session = data.session;
      state.auth.user = data.user;
      console.log('[Auth] Login bem-sucedido:', data.user?.id);
      return data;
    } catch (error) {
      console.error('[Auth] Falha ao fazer login:', error.message);
      throw error;
    }
  },

  async signInWithGoogle() {
    try {
      const supabase = getSupabase();
      console.log('[Auth] Tentando login com Google');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        console.error('[Auth] Erro no login com Google:', error.message);
        throw error;
      }
      console.log('[Auth] Redirecionando para o Google OAuth');
      return data;
    } catch (error) {
      console.error('[Auth] Falha no login com Google:', error.message);
      throw error;
    }
  },

  async signup(email, password, nome = '') {
    try {
      const supabase = getSupabase();
      console.log('[Auth] Registrando novo usuário:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });
      if (error) {
        console.error('[Auth] Erro ao registrar:', error.message);
        throw error;
      }
      state.auth.session = data.session;
      state.auth.user = data.user;
      console.log('[Auth] Registro bem-sucedido:', data.user?.id);
      return data;
    } catch (error) {
      console.error('[Auth] Falha ao registrar:', error.message);
      throw error;
    }
  },

  async logout() {
    try {
      const supabase = getSupabase();
      console.log('[Auth] Fazendo logout');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Erro ao fazer logout:', error.message);
        throw error;
      }
      state.auth.session = null;
      state.auth.user = null;
      console.log('[Auth] Logout bem-sucedido');
    } catch (error) {
      console.error('[Auth] Falha ao fazer logout:', error.message);
      throw error;
    }
  },

  uid() {
    return state.auth.user?.id || null;
  },
};
