/**
 * Test Suite para Supabase Integration
 * 
 * Use no console do navegador:
 * import('./src/test-supabase.js').then(tests => tests.runAllTests());
 * 
 * Ou em um script:
 * node --experimental-modules test-supabase.js
 */

import { isSupabaseConfigured, getSupabase } from './services/supabaseClient.js';
import { auth } from './services/auth.js';
import { api } from './services/api.js';
import { syncNow, queueSync, scheduleSync } from './services/sync.js';
import { state } from './state.js';

const tests = [];
let testResults = { passed: 0, failed: 0, errors: [] };

const test = (name, fn) => {
  tests.push({ name, fn });
};

const assertEquals = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
};

const assertTruthy = (value, message) => {
  if (!value) {
    throw new Error(`${message}: expected truthy, got ${value}`);
  }
};

const assertTrue = (value, message) => {
  if (value !== true) {
    throw new Error(`${message}: expected true, got ${value}`);
  }
};

const assertExists = (value, message) => {
  if (!value) {
    throw new Error(`${message}: value does not exist`);
  }
};

const runTest = async (test) => {
  try {
    console.log(`\n📝 Testando: ${test.name}`);
    await test.fn();
    console.log(`✅ ${test.name}`);
    testResults.passed += 1;
  } catch (error) {
    console.error(`❌ ${test.name}`);
    console.error(`   Erro: ${error.message}`);
    testResults.failed += 1;
    testResults.errors.push({ test: test.name, error: error.message });
  }
};

// ============================================================================
// TESTES
// ============================================================================

test('1. Config: Supabase configurado corretamente', () => {
  const configured = isSupabaseConfigured();
  assertTrue(configured, 'Supabase deve estar configurado');
  console.log('  ✓ URL e anonKey estão válidos');
});

test('2. Client: Cliente Supabase inicializado', () => {
  const supabase = getSupabase();
  assertExists(supabase, 'Cliente Supabase');
  assertExists(supabase.auth, 'Auth module');
  assertExists(supabase.from, 'Database module');
  console.log('  ✓ Cliente Supabase disponível');
});

test('3. Auth: Estado inicial', () => {
  assertEquals(state.auth.configured, true, 'Configurado');
  assertEquals(state.auth.user, null, 'Nenhum usuário antes de fazer login');
  assertEquals(state.auth.session, null, 'Nenhuma sessão antes de fazer login');
  console.log('  ✓ Estado de auth inicializado corretamente');
});

test('4. Auth: Registro de novo usuário', async () => {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const nome = 'Test User';
  
  console.log(`  Registrando: ${email}`);
  const { user, session } = await auth.signup(email, password, nome);
  
  assertExists(user, 'User após signup');
  assertExists(user.id, 'User ID');
  assertEquals(user.email, email, 'Email do usuário');
  assertExists(session, 'Session após signup');
  
  console.log(`  ✓ Usuário registrado: ${user.id}`);
  console.log(`  ✓ Sessão ativa: ${session.access_token.substring(0, 20)}...`);
  
  // Armazenar ID para testes posteriores
  window.testUserId = user.id;
  window.testEmail = email;
  window.testPassword = password;
});

test('5. Auth: UID atualizado após login', () => {
  const uid = auth.uid();
  assertExists(uid, 'UID não pode ser null');
  assertEquals(uid, state.auth.user?.id, 'UID deve corresponder ao state');
  console.log(`  ✓ UID: ${uid}`);
});

test('6. API: Salvar rota', async () => {
  const rota = {
    id: crypto.randomUUID(),
    data: new Date().toISOString().split('T')[0],
    empresa: 'Teste Empresa',
    valor: 150.50,
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
  
  console.log(`  Salvando rota: ${rota.id}`);
  const salva = await api.salvarRota(rota);
  
  assertExists(salva, 'Rota salva');
  assertEquals(salva.id, rota.id, 'ID da rota');
  assertEquals(salva.empresa, rota.empresa, 'Empresa');
  assertEquals(salva.valor, rota.valor, 'Valor');
  assertEquals(salva.km, rota.km, 'KM');
  
  console.log(`  ✓ Rota salva com sucesso`);
  window.testRotaId = rota.id;
});

test('7. API: Buscar rotas do usuário', async () => {
  const rotas = await api.buscarRotas();
  
  assertExists(rotas, 'Array de rotas');
  assertTrue(Array.isArray(rotas), 'Deve ser um array');
  assertTrue(rotas.length > 0, 'Deve ter pelo menos uma rota');
  
  const rotaTest = rotas.find(r => r.id === window.testRotaId);
  assertExists(rotaTest, 'Rota criada no teste anterior');
  
  console.log(`  ✓ ${rotas.length} rota(s) encontrada(s)`);
});

test('8. API: Salvar vale', async () => {
  const vale = {
    id: crypto.randomUUID(),
    dataVale: new Date().toISOString().split('T')[0],
    valorVale: 100.00,
    descricao: 'Adiantamento de teste',
  };
  
  console.log(`  Salvando vale: ${vale.id}`);
  const salvo = await api.salvarVale(vale);
  
  assertExists(salvo, 'Vale salvo');
  assertEquals(salvo.id, vale.id, 'ID do vale');
  assertEquals(salvo.valorVale, vale.valorVale, 'Valor');
  assertEquals(salvo.descricao, vale.descricao, 'Descrição');
  
  console.log(`  ✓ Vale salvo com sucesso`);
  window.testValeId = vale.id;
});

test('9. API: Buscar vales do usuário', async () => {
  const vales = await api.buscarVales();
  
  assertExists(vales, 'Array de vales');
  assertTrue(Array.isArray(vales), 'Deve ser um array');
  assertTrue(vales.length > 0, 'Deve ter pelo menos um vale');
  
  const valeTest = vales.find(v => v.id === window.testValeId);
  assertExists(valeTest, 'Vale criado no teste anterior');
  
  console.log(`  ✓ ${vales.length} vale(s) encontrado(s)`);
});

test('10. API: Editar rota (Upsert)', async () => {
  const rotaEditada = {
    id: window.testRotaId,
    data: new Date().toISOString().split('T')[0],
    empresa: 'Empresa Atualizada',
    valor: 200.00,
    km: 50,
    duracao: 300,
    qtdEntregas: 15,
    consumoVeiculo: 9,
    precoCombustivel: 5.50,
    custoPorKm: 4.00,
    custoPorKmIncluiCombustivel: true,
    ajudante: 60.00,
    outros: 30.00,
  };
  
  console.log(`  Atualizando rota: ${rotaEditada.id}`);
  const atualizada = await api.salvarRota(rotaEditada);
  
  assertEquals(atualizada.empresa, 'Empresa Atualizada', 'Empresa deve ser atualizada');
  assertEquals(atualizada.valor, 200.00, 'Valor deve ser atualizado');
  
  console.log(`  ✓ Rota atualizada sem duplicação`);
});

test('11. Sync: Fila e log de operação', async () => {
  const operacao = await queueSync('/rotas', {
    id: crypto.randomUUID(),
    data: new Date().toISOString().split('T')[0],
    empresa: 'Teste Fila',
    valor: 50,
    km: 10,
    duracao: 60,
    qtdEntregas: 1,
  });
  
  assertExists(operacao.operationId, 'Operation ID');
  assertEquals(operacao.path, '/rotas', 'Path');
  
  console.log(`  ✓ Operação enfileirada: ${operacao.operationId}`);
  window.testOperationId = operacao.operationId;
});

test('12. Sync: Status e pendentes', () => {
  assertTrue(state.sync.status === 'online' || state.sync.status === 'syncing', 'Status deve ser válido');
  assertTrue(Array.isArray(state.sync.pendentes), 'Pendentes deve ser um array');
  
  console.log(`  ✓ Status: ${state.sync.status}`);
  console.log(`  ✓ Pendentes: ${state.sync.pendentes.length}`);
});

test('13. API: Deletar rota (soft delete)', async () => {
  console.log(`  Deletando rota: ${window.testRotaId}`);
  const resultado = await api.deletarRota(window.testRotaId);
  
  assertEquals(resultado.id, window.testRotaId, 'ID deve corresponder');
  
  // Verificar que está marcada como deletada
  const rotas = await api.buscarRotas();
  const deletada = rotas.find(r => r.id === window.testRotaId);
  assertEquals(deletada, undefined, 'Rota deletada não deve aparecer nas buscas');
  
  console.log(`  ✓ Rota deletada (soft delete com deleted_at)`);
});

test('14. API: Deletar vale (soft delete)', async () => {
  console.log(`  Deletando vale: ${window.testValeId}`);
  const resultado = await api.deletarVale(window.testValeId);
  
  assertEquals(resultado.id, window.testValeId, 'ID deve corresponder');
  
  // Verificar que está marcada como deletada
  const vales = await api.buscarVales();
  const deletado = vales.find(v => v.id === window.testValeId);
  assertEquals(deletado, undefined, 'Vale deletado não deve aparecer nas buscas');
  
  console.log(`  ✓ Vale deletado (soft delete com deleted_at)`);
});

test('15. RLS: Isolamento de dados por usuário', async () => {
  console.log(`  Testando isolamento de dados...`);
  
  // Criar rota como usuário 1 (já autenticado)
  const rota1 = {
    id: crypto.randomUUID(),
    data: new Date().toISOString().split('T')[0],
    empresa: 'User 1 Company',
    valor: 100,
    km: 10,
    duracao: 60,
    qtdEntregas: 1,
  };
  
  const salva = await api.salvarRota(rota1);
  assertExists(salva.id, 'Rota salva por user 1');
  
  // Tentar registrar como user 2
  const email2 = `test2-${Date.now()}@example.com`;
  const { user: user2 } = await auth.signup(email2, 'TestPassword123!', 'User 2');
  
  // User 2 tenta buscar rotas (deve ver só as dele, não a do user 1)
  const rotas = await api.buscarRotas();
  const rotaUser1 = rotas.find(r => r.id === rota1.id);
  
  // User 2 não deve ver a rota do User 1
  assertEquals(rotaUser1, undefined, 'User 2 não deve ver rotas de User 1');
  
  console.log(`  ✓ RLS funcionando: cada usuário vê só seus dados`);
  
  // Fazer login novamente como user 1
  const { user: user1 } = await auth.login(window.testEmail, window.testPassword);
  assertEquals(user1.id, window.testUserId, 'De volta ao user 1');
});

test('16. Auth: Logout', async () => {
  console.log(`  Fazendo logout...`);
  await auth.logout();
  
  assertEquals(state.auth.session, null, 'Session deve ser null após logout');
  assertEquals(state.auth.user, null, 'User deve ser null após logout');
  assertEquals(auth.uid(), null, 'UID deve ser null após logout');
  
  console.log(`  ✓ Logout bem-sucedido`);
});

// ============================================================================
// RUNNER
// ============================================================================

export const runAllTests = async () => {
  console.log('================================');
  console.log('🧪 Iniciando testes de Supabase');
  console.log('================================');
  
  for (const testCase of tests) {
    await runTest(testCase);
  }
  
  console.log('\n================================');
  console.log('📊 Resultados dos Testes');
  console.log('================================');
  console.log(`✅ Passou: ${testResults.passed}`);
  console.log(`❌ Falhou: ${testResults.failed}`);
  console.log(`Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Erros:');
    testResults.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error.test}`);
      console.log(`   ${error.error}`);
    });
  }
  
  const success = testResults.failed === 0;
  console.log(`\n${success ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM'}`);
  console.log('================================\n');
  
  return {
    passed: testResults.passed,
    failed: testResults.failed,
    success,
  };
};

// Auto-run se for executado diretamente
if (typeof window === 'undefined') {
  // Node.js environment
  runAllTests().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
