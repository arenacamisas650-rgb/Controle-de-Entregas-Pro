# Exemplo de Uso Prático - Integração Supabase

## 📱 Exemplos de Código Para as Telas

### 1. Tela de Login

```javascript
// src/ui/login.js (ou onde estiver)

import { auth } from '../services/auth.js';

export const initLoginForm = () => {
  const formLogin = document.getElementById('formLogin');
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const btnLogin = document.getElementById('btnLogin');
  const errorMsg = document.getElementById('errorMsg');

  btnLogin.addEventListener('click', async () => {
    try {
      errorMsg.textContent = '';
      btnLogin.disabled = true;
      btnLogin.textContent = 'Entrando...';

      const { user, session } = await auth.login(
        inputEmail.value,
        inputPassword.value
      );

      console.log('✅ Login bem-sucedido:', user.id);
      
      // Navegar para dashboard
      showPage('dashboard');
      
    } catch (error) {
      console.error('❌ Erro de login:', error);
      errorMsg.textContent = error.message || 'Falha ao fazer login';
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  });
};
```

### 2. Tela de Cadastro

```javascript
// src/ui/signup.js

import { auth } from '../services/auth.js';

export const initSignupForm = () => {
  const formSignup = document.getElementById('formSignup');
  const inputNome = document.getElementById('inputNome');
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const btnSignup = document.getElementById('btnSignup');
  const errorMsg = document.getElementById('errorMsg');

  btnSignup.addEventListener('click', async () => {
    try {
      errorMsg.textContent = '';
      
      // Validação
      if (!inputNome.value) throw new Error('Nome é obrigatório');
      if (!inputEmail.value) throw new Error('Email é obrigatório');
      if (inputPassword.value.length < 6) throw new Error('Senha deve ter 6+ caracteres');

      btnSignup.disabled = true;
      btnSignup.textContent = 'Criando conta...';

      const { user } = await auth.signup(
        inputEmail.value,
        inputPassword.value,
        inputNome.value
      );

      console.log('✅ Cadastro bem-sucedido:', user.id);
      
      // Navegar para dashboard
      showPage('dashboard');
      
    } catch (error) {
      console.error('❌ Erro de cadastro:', error);
      errorMsg.textContent = error.message || 'Falha ao criar conta';
    } finally {
      btnSignup.disabled = false;
      btnSignup.textContent = 'Criar Conta';
    }
  });
};
```

### 3. Salvar Nova Rota

```javascript
// src/ui/trabalho-ativo.js (ou formulário de rota)

import { api } from '../services/api.js';
import { queueSync } from '../services/sync.js';

export const salvarRota = async (formData) => {
  try {
    const rota = {
      id: crypto.randomUUID(),
      data: formData.data,
      empresa: formData.empresa,
      valor: parseFloat(formData.valor),
      km: parseFloat(formData.km),
      duracao: parseInt(formData.duracao),
      qtdEntregas: parseInt(formData.qtdEntregas),
      consumoVeiculo: parseFloat(formData.consumoVeiculo || 0),
      precoCombustivel: parseFloat(formData.precoCombustivel || 0),
      custoPorKm: parseFloat(formData.custoPorKm || 0),
      custoPorKmIncluiCombustivel: formData.custoPorKmIncluiCombustivel || false,
      ajudante: parseFloat(formData.ajudante || 0),
      outros: parseFloat(formData.outros || 0),
      createdAt: new Date().toISOString(),
    };

    console.log('📝 Salvando rota:', rota.id);

    // Tenta salvar direto se online
    const salva = await api.salvarRota(rota);
    
    console.log('✅ Rota salva:', salva.id);
    
    // Limpar formulário
    document.getElementById('formRota').reset();
    
    // Atualizar lista
    await carregarRotas();
    
    return salva;

  } catch (error) {
    console.error('❌ Erro ao salvar rota:', error);
    
    // Se offline, enfileirar para sincronizar depois
    if (!navigator.onLine) {
      console.log('📤 Offline - enfileirando rota para sincronizar');
      await queueSync('/rotas', rota);
      showNotification('Rota salva localmente. Será sincronizada online.', 'info');
      await carregarRotas();
      return rota;
    }
    
    showNotification(error.message, 'error');
    throw error;
  }
};

export const carregarRotas = async () => {
  try {
    console.log('📥 Carregando rotas...');
    const rotas = await api.buscarRotas();
    
    console.log(`✅ ${rotas.length} rotas carregadas`);
    
    // Renderizar na tela
    renderRotas(rotas);
    
    return rotas;

  } catch (error) {
    console.error('❌ Erro ao carregar rotas:', error);
    showNotification('Erro ao carregar rotas', 'error');
    throw error;
  }
};

const renderRotas = (rotas) => {
  const container = document.getElementById('rotasContainer');
  container.innerHTML = '';
  
  rotas.forEach(rota => {
    const card = document.createElement('div');
    card.className = 'card rota-card';
    card.innerHTML = `
      <div class="rota-header">
        <h3>${rota.empresa}</h3>
        <span class="rota-date">${new Date(rota.data).toLocaleDateString('pt-BR')}</span>
      </div>
      <div class="rota-stats">
        <div class="stat">
          <label>Valor</label>
          <span>R$ ${rota.valor.toFixed(2)}</span>
        </div>
        <div class="stat">
          <label>KM</label>
          <span>${rota.km} km</span>
        </div>
        <div class="stat">
          <label>Entregas</label>
          <span>${rota.qtdEntregas}</span>
        </div>
      </div>
      <div class="rota-actions">
        <button class="btn-edit" onclick="editarRota('${rota.id}')">Editar</button>
        <button class="btn-delete" onclick="deletarRota('${rota.id}')">Deletar</button>
      </div>
    `;
    container.appendChild(card);
  });
};

export const deletarRota = async (id) => {
  if (!confirm('Tem certeza que deseja deletar esta rota?')) return;
  
  try {
    console.log('🗑️ Deletando rota:', id);
    await api.deletarRota(id);
    
    console.log('✅ Rota deletada');
    showNotification('Rota deletada com sucesso', 'success');
    
    await carregarRotas();

  } catch (error) {
    console.error('❌ Erro ao deletar rota:', error);
    showNotification(error.message, 'error');
  }
};
```

### 4. Sincronização Automática

```javascript
// src/app.js (inicialização)

import { auth } from './services/auth.js';
import { scheduleSync } from './services/sync.js';
import { state } from './state.js';

export const initApp = async () => {
  try {
    console.log('🚀 Iniciando Entrega Pro...');

    // 1. Inicializar autenticação
    console.log('🔐 Inicializando autenticação...');
    await auth.init((event, session) => {
      console.log('🔄 Estado de autenticação mudou:', event);
      updateAuthUI();
    });

    // 2. Se usuário autenticado, carregar dados
    if (auth.uid()) {
      console.log('👤 Usuário autenticado:', auth.uid());
      await carregarRotas();
      await carregarVales();
    } else {
      console.log('🔓 Nenhum usuário autenticado');
      showPage('login');
    }

    // 3. Inicializar sincronização automática
    console.log('🔄 Iniciando sincronização...');
    scheduleSync(() => {
      updateSyncStatus();
      console.log('📤 Sincronização completada');
    });

    // 4. Monitorar mudanças de conexão
    window.addEventListener('online', () => {
      console.log('🟢 App voltou online');
      updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 App ficou offline');
      updateConnectionStatus();
    });

    console.log('✅ App inicializado com sucesso');

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    showNotification('Erro ao inicializar app', 'error');
  }
};

const updateAuthUI = () => {
  const btnLogout = document.getElementById('btnLogout');
  const userName = document.getElementById('userName');
  const loginPage = document.getElementById('loginPage');
  const dashboardPage = document.getElementById('dashboardPage');

  if (auth.uid()) {
    // Usuário autenticado
    userName.textContent = state.auth.user?.user_metadata?.nome || 'Usuário';
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';

    btnLogout.addEventListener('click', async () => {
      await auth.logout();
      updateAuthUI();
    });
  } else {
    // Nenhum usuário
    loginPage.style.display = 'block';
    dashboardPage.style.display = 'none';
  }
};

const updateSyncStatus = () => {
  const syncStatus = document.getElementById('syncStatus');
  const badge = syncStatus.querySelector('span');
  
  if (state.sync.status === 'online') {
    badge.className = 'badge-online';
    badge.textContent = '● Online';
  } else if (state.sync.status === 'offline') {
    badge.className = 'badge-offline';
    badge.textContent = '● Offline';
  } else {
    badge.className = 'badge-syncing';
    badge.textContent = '● Sincronizando...';
  }

  if (state.sync.pendentes.length > 0) {
    const info = document.getElementById('syncInfo');
    info.textContent = `${state.sync.pendentes.length} item(s) pendente(s)`;
    info.style.display = 'block';
  }
};

const updateConnectionStatus = () => {
  const connectionStatus = document.getElementById('connectionStatus');
  connectionStatus.textContent = navigator.onLine ? '🟢 Online' : '🔴 Offline';
  connectionStatus.className = navigator.onLine ? 'online' : 'offline';
};
```

### 5. Formulário de Vale

```javascript
// src/ui/vales.js

import { api } from '../services/api.js';

export const salvarVale = async (formData) => {
  try {
    const vale = {
      id: crypto.randomUUID(),
      dataVale: formData.dataVale,
      valorVale: parseFloat(formData.valorVale),
      descricao: formData.descricao,
      createdAt: new Date().toISOString(),
    };

    console.log('📝 Salvando vale:', vale.id);

    const salvo = await api.salvarVale(vale);

    console.log('✅ Vale salvo:', salvo.id);

    document.getElementById('formVale').reset();
    await carregarVales();

    return salvo;

  } catch (error) {
    console.error('❌ Erro ao salvar vale:', error);
    showNotification(error.message, 'error');
    throw error;
  }
};

export const carregarVales = async () => {
  try {
    console.log('📥 Carregando vales...');
    const vales = await api.buscarVales();

    console.log(`✅ ${vales.length} vales carregados`);

    renderVales(vales);

    return vales;

  } catch (error) {
    console.error('❌ Erro ao carregar vales:', error);
    showNotification('Erro ao carregar vales', 'error');
    throw error;
  }
};
```

---

## 📊 Exemplo de Estado Global

```javascript
// src/state.js (estrutura)

export const state = {
  auth: {
    configured: false,
    loading: true,
    user: null,
    session: null,
    event: null,
  },

  sync: {
    status: 'offline', // 'online' | 'offline' | 'syncing'
    syncing: false,
    pendentes: [],
    lastSyncAt: null,
  },

  loading: {
    rotas: false,
    vales: false,
    sync: false,
  },

  data: {
    rotas: [],
    vales: [],
  },
};
```

---

## 🎨 CSS Para Indicadores de Status

```css
/* Indicador de sincronização */
#syncStatus {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--border);
}

#syncStatus .badge-online {
  color: var(--green);
}

#syncStatus .badge-offline {
  color: var(--red);
}

#syncStatus .badge-syncing {
  color: var(--yellow);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

#syncInfo {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Indicador de conexão */
#connectionStatus {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

#connectionStatus.online {
  background: var(--success-soft);
  color: var(--green);
}

#connectionStatus.offline {
  background: var(--danger-soft);
  color: var(--red);
}
```

---

## 🔍 Console Esperado

Quando o usuário faz login e trabalha offline:

```
[Auth] Tentando login com email: user@example.com
[Auth] Login bem-sucedido: 550e8400-e29b-41d4-a716-446655440000
[API] Buscando rotas para o usuário: 550e8400...
[API] Rotas recuperadas: 3
[Sync] Status: online
[Sync] Sincronização programada - intervalo de 30s
🔴 App ficou offline

[API] Salvando rota: { id: 123..., user_id: 550e..., data: 2025-05-06 }
[Sync] Offline - sincronização adiada
[Sync] Item enfileirado: { path: /rotas, operationId: abc..., attempts: 0 }
✅ Rota salva localmente

🟢 App voltou online
[Sync] Status: online
[Sync] Iniciando sincronização com 1 items
[API] Salvando rota: { id: 123..., user_id: 550e..., data: 2025-05-06 }
[API] Rota salva com sucesso: 123...
[Sync] Item sincronizado com sucesso: abc...
[Sync] Sincronização concluída: { enviados: 1, restantes: 0 }
```

---

## ✅ Checklist de Integração

Para cada tela:

- [ ] Importar `auth` ou `api` conforme necessário
- [ ] Envolver em try/catch
- [ ] Log com `console.log('[Service]', msg)`
- [ ] Mostrar feedback visual ao usuário
- [ ] Testar offline (DevTools > Network > Offline)
- [ ] Verificar fila de sync em `state.sync.pendentes`

Pronto para usar! 🚀
