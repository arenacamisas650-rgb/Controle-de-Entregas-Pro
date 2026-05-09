# 🧪 Como Testar a Integração Supabase

## ⚡ Teste Rápido (5 minutos)

### Passo 1: Abrir o Console do Navegador
1. Abra o app no navegador
2. Pressione `F12` (DevTools)
3. Clique na aba **Console**

### Passo 2: Verificar se está Configurado
Cole no console:
```javascript
import { isSupabaseConfigured } from './src/services/supabaseClient.js';
console.log('Configurado?', isSupabaseConfigured());
```

**Esperado:** `true` (verde)

Se for `false`, verifique `src/config.js`

### Passo 3: Fazer Teste de Cadastro
```javascript
import { auth } from './src/services/auth.js';

const testEmail = `teste-${Date.now()}@example.com`;
const { user } = await auth.signup(testEmail, 'Senha123!', 'Usuário Teste');

console.log('✅ Usuário criado:', user.id);
```

**Esperado:** Um ID de usuário UUID

### Passo 4: Salvar uma Rota
```javascript
import { api } from './src/services/api.js';

const rota = {
  id: crypto.randomUUID(),
  data: '2025-05-06',
  empresa: 'Empresa Teste',
  valor: 150.00,
  km: 45.5,
  duracao: 240,
  qtdEntregas: 12,
  consumoVeiculo: 8.5,
  precoCombustivel: 5.50,
  custoPorKm: 3.30,
  custoPorKmIncluiCombustivel: true,
  ajudante: 50.00,
  outros: 20.00,
};

const salva = await api.salvarRota(rota);
console.log('✅ Rota salva:', salva.id);
```

**Esperado:** ID da rota salva

### Passo 5: Buscar Rotas
```javascript
const rotas = await api.buscarRotas();
console.log('✅ Rotas carregadas:', rotas.length);
rotas.forEach(r => console.log(`  - ${r.empresa}: R$ ${r.valor}`));
```

**Esperado:** Lista de rotas do usuário

---

## 🏃 Teste Completo Automático

Cole tudo isso de uma vez no console:

```javascript
import('./src/test-supabase.js').then(tests => {
  console.log('🚀 Iniciando testes...');
  return tests.runAllTests();
}).catch(err => {
  console.error('❌ Erro ao rodar testes:', err);
});
```

**Esperado:** Um relatório com todos os testes
```
✅ Passou: 16
❌ Falhou: 0
Total: 16

✅ TODOS OS TESTES PASSARAM!
```

---

## 📱 Teste de Offline

### Teste 1: Salvar Offline
1. Abrir DevTools (F12)
2. Network > Throttling > Offline
3. Tentar salvar uma rota
4. Console deve mostrar: `[Sync] Item enfileirado`
5. Voltar a Online
6. Console deve mostrar sincronização automática

### Teste 2: Verificar Fila
```javascript
import { state } from './src/state.js';
console.log('Pendentes:', state.sync.pendentes);
console.log('Status:', state.sync.status);
```

---

## 🔍 Monitorar Logs

Todos os logs têm prefixo, basta buscar:

### Autenticação
```
[Auth]
```

### Operações de Dados
```
[API]
```

### Sincronização
```
[Sync]
```

### Inicialização Supabase
```
[Supabase]
```

---

## ❌ Troubleshooting

### Erro: "Configuração incompleta"
→ Verifique `src/config.js`  
→ URL deve ser `https://mbhicowcfqxctljrwzkl.supabase.co`

### Erro: "Cliente Supabase não foi carregado"
→ Verifique se `index.html` tem:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.2/dist/umd/supabase.min.js"></script>
```

### Erro: "Faça login para sincronizar"
→ Você precisa fazer login primeiro com `auth.login()` ou `auth.signup()`

### Erro: "Sem conexão"
→ Aplicação está offline  
→ Abra DevTools > Network e verifique

---

## ✅ Checklist de Testes

Marque ao completar:

- [ ] Configuração validada (isSupabaseConfigured = true)
- [ ] Cadastro funcionando (user.id retornado)
- [ ] Login funcionando
- [ ] Salvar rota funcionando
- [ ] Buscar rotas funcionando
- [ ] Editar rota (upsert) funcionando
- [ ] Deletar rota funcionando
- [ ] Salvar vale funcionando
- [ ] Buscar vales funcionando
- [ ] Teste offline → salva localmente
- [ ] Volta online → sincroniza automático
- [ ] Todos 16 testes passam
- [ ] RLS funciona (usuários isolados)

---

## 📊 Relatório Esperado

Quando rodar `runAllTests()`:

```
================================
🧪 Iniciando testes de Supabase
================================

📝 Testando: 1. Config: Supabase configurado corretamente
✅ 1. Config: Supabase configurado corretamente

📝 Testando: 2. Client: Cliente Supabase inicializado
✅ 2. Client: Cliente Supabase inicializado

...

📝 Testando: 16. Auth: Logout
✅ 16. Auth: Logout

================================
📊 Resultados dos Testes
================================
✅ Passou: 16
❌ Falhou: 0
Total: 16

✅ TODOS OS TESTES PASSARAM!
================================
```

---

## 🎯 Próximo Passo

Uma vez que tudo funciona no console:

1. Vá para `EXEMPLO-USO-PRÁTICO.md`
2. Copie o código para suas telas (login, rota, vale)
3. Adapte para sua estrutura HTML
4. Teste cada formulário
5. Valide offline-first com DevTools

---

## 💡 Dica: Ver Dados no Supabase

Para confirmar que os dados foram salvos:

1. Acesse: https://app.supabase.com
2. Login com sua conta
3. Projeto: mbhicowcfqxctljrwzkl
4. Abra as tabelas `rotas`, `vales`, `usuarios`
5. Deve aparecer os dados que salvou

---

**Teste agora! O código está pronto para rodar.** ✨
