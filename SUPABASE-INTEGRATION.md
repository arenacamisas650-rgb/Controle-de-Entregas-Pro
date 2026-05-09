# Integração Supabase - Guia Completo

## ✅ Status da Integração

### Configurações Implementadas
- ✅ **config.js**: Credenciais do Supabase configuradas
- ✅ **supabaseClient.js**: Cliente Supabase inicializado com validação
- ✅ **auth.js**: Login, signup e logout com logs de erro detalhados
- ✅ **api.js**: CRUD de rotas e vales com operações upsert (sem duplicação)
- ✅ **sync.js**: Fila offline-first com retry automático (máx 5 tentativas)
- ✅ **schema.sql**: Tabelas criadas com RLS (Row Level Security) e triggers

### Credenciais Ativas
```
Project: mbhicowcfqxctljrwzkl
Region: sul-1 (São Paulo)
URL: https://mbhicowcfqxctljrwzkl.supabase.co
```

---

## 🔐 Fluxo de Autenticação

### 1. Inicialização
```javascript
import { auth } from './src/services/auth.js';

// Quando a app inicia
await auth.init((event, session) => {
  console.log('Mudança de autenticação:', event);
  // Atualizar UI
});
```

### 2. Login
```javascript
const { user, session } = await auth.login('user@example.com', 'senha123');
console.log('Usuário logado:', user.id);
```

### 3. Cadastro
```javascript
const { user, session } = await auth.signup(
  'novo@example.com',
  'senha123',
  'Nome do Usuário'
);
```

### 4. Obter ID do Usuário
```javascript
const userId = auth.uid();
```

### 5. Logout
```javascript
await auth.logout();
```

---

## 📊 Operações de Dados

### Salvar Rota
```javascript
import { api } from './src/services/api.js';

const rota = {
  id: 'uuid-gerado',
  data: '2025-05-06',
  empresa: 'Entrega XYZ',
  valor: 150.00,
  km: 45.5,
  duracao: 240,
  qtdEntregas: 12,
  consumoVeiculo: 8.5,
  precoCombustivel: 5.50,
  custoPorKm: 3.30,
  custoPorKmIncluiCombustivel: true,
  ajudante: 50.00,
  outros: 20.00
};

const salva = await api.salvarRota(rota);
console.log('Rota salva:', salva.id);
```

### Buscar Rotas
```javascript
const rotas = await api.buscarRotas();
console.log('Total de rotas:', rotas.length);
rotas.forEach(rota => {
  console.log(`${rota.data} - ${rota.empresa}: R$ ${rota.valor}`);
});
```

### Deletar Rota
```javascript
await api.deletarRota('id-da-rota');
console.log('Rota deletada');
```

### Salvar Vale
```javascript
const vale = {
  id: 'uuid-gerado',
  dataVale: '2025-05-06',
  valorVale: 100.00,
  descricao: 'Adiantamento'
};

const salvo = await api.salvarVale(vale);
```

### Buscar Vales
```javascript
const vales = await api.buscarVales();
console.log('Total de vales:', vales.length);
```

### Deletar Vale
```javascript
await api.deletarVale('id-do-vale');
```

---

## 🔄 Sincronização Offline-First

### Inicializar Sincronização
```javascript
import { scheduleSync } from './src/services/sync.js';

scheduleSync(() => {
  console.log('Sincronização completa');
  // Atualizar UI
});
```

### Comportamento Automático
- ✅ Enfileira operações quando offline
- ✅ Sincroniza cada 30 segundos quando online
- ✅ Sincroniza imediatamente ao voltar online
- ✅ Retry automático até 5 tentativas
- ✅ Log completo de erros e status
- ✅ Usa `upsert` para evitar duplicação

### Fila de Sincronização
```javascript
import { state } from './src/state.js';

// Ver itens pendentes
console.log('Pendentes:', state.sync.pendentes);
// [{ id, path, payload, attempts, lastError, ... }]

// Status
console.log('Status:', state.sync.status); // 'online' | 'offline' | 'syncing'
```

---

## 📋 Segurança de Dados

### Row Level Security (RLS)
Cada usuário só pode ver seus próprios dados:
```sql
-- Rotas: auth.uid() = user_id
-- Vales: auth.uid() = user_id
-- Usuários: auth.uid() = id
```

### Validação de Dados
- ✅ Todas as rotas/vales são validadas antes de enviar
- ✅ Valores numéricos garantem não-negativos no banco
- ✅ user_id é sempre preenchido com auth.uid()
- ✅ Timestamps são gerenciados automaticamente

### Garantias de Upsert
```javascript
// Evita duplicação usando onConflict: 'id'
// + sync_operation_id único por usuário
// = sem registros duplicados mesmo com retry
```

---

## 🐛 Logs de Erro

Todos os erros são registrados com prefixo `[Service]`:

### Supabase
```
[Supabase] Configuração incompleta
[Supabase] Inicializando cliente com URL: ...
[Supabase] Cliente inicializado com sucesso
```

### Autenticação
```
[Auth] Tentando login com email: ...
[Auth] Erro de login: Invalid credentials
[Auth] Login bem-sucedido: user-id
[Auth] Mudança de autenticação: SIGNED_IN user: ...
```

### API
```
[API] Salvando rota: { id: ..., user_id: ..., data: ... }
[API] Erro ao salvar rota: { code: ..., message: ... }
[API] Rota salva com sucesso: id
[API] Buscando rotas para o usuário: uid
[API] Rotas recuperadas: 5
```

### Sincronização
```
[Sync] Item enfileirado: { path, operationId, attempts: 0 }
[Sync] Status: online | offline | syncing
[Sync] Iniciando sincronização com 3 items
[Sync] Item sincronizado com sucesso: operationId
[Sync] Erro ao sincronizar item: { operationId, tentativa: 1, erro: ..., retentando: true }
[Sync] Item descartado após 5 tentativas: operationId
```

---

## ✨ Teste Rápido

Abra o console do navegador (F12) e execute:

```javascript
// 1. Testar configuração
import { isSupabaseConfigured } from './src/services/supabaseClient.js';
console.log('Configurado:', isSupabaseConfigured());

// 2. Testar login
import { auth } from './src/services/auth.js';
const { user } = await auth.signup('teste@example.com', 'teste123', 'Teste');
console.log('User ID:', user.id);

// 3. Testar salvar rota
import { api } from './src/services/api.js';
const rota = await api.salvarRota({
  id: crypto.randomUUID(),
  data: new Date().toISOString().split('T')[0],
  empresa: 'Teste',
  valor: 100,
  km: 10,
  duracao: 60,
  qtdEntregas: 1,
});
console.log('Rota:', rota);

// 4. Testar buscar
const rotas = await api.buscarRotas();
console.log('Total de rotas:', rotas.length);
```

---

## 🚀 Próximos Passos

1. **Integrar com UI**: Chamar as funções `auth`, `api` e `syncNow` nos formulários
2. **Testar Offline**: Desligar rede e adicionar dados - devem sincronizar quando voltar online
3. **Monitorar Logs**: Console deve mostrar fluxo completo de cada operação
4. **Validar RLS**: Um usuário não deve conseguir ver dados de outro (testar com 2 contas)

---

## 📞 Suporte

Se algo não funcionar:
1. Abra DevTools (F12)
2. Procure por mensagens `[Supabase]`, `[Auth]`, `[API]` ou `[Sync]`
3. A mensagem de erro explicitará o problema
4. Verifique se as credenciais estão corretas em `src/config.js`
