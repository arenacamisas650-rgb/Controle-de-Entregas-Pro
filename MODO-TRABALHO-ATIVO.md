# Sistema Inteligente em Tempo Real - Modo Trabalho Ativo

## 🚀 Novo Recurso: Trabalho Ativo em Tempo Real

O **Modo Trabalho Ativo** permite que você acompanhe suas métricas em tempo real durante o turno de trabalho, com alertas automáticos, previsões e sugestões inteligentes.

## 📊 Como Usar

### 1. Iniciar o Modo Trabalho Ativo

No dashboard home, você verá um card mostrando "Modo Trabalho Ativo" com um botão **"Iniciar Turno"**.

Ao clicar:
- O sistema registra o horário de início
- Define a meta diária automaticamente (baseado na meta mensal / 30)
- Começa a atualizar as métricas a cada 30 segundos

### 2. Métricas Exibidas em Tempo Real

#### Lucro Hoje
- Soma de todos os lucros das rotas registradas hoje
- Atualiza automaticamente conforme você adiciona rotas

#### Ganho/Hora
- Calculado como: Lucro Atual ÷ Horas Decorridas
- Permite entender seu ritmo de trabalho

#### Meta Diária
- Valor alvo para o dia (padrão: meta mensal ÷ 30)
- Comparável com "Lucro Hoje"

#### Faltam (para Meta)
- Quanto falta em reais para atingir a meta
- Fica verde quando chega a zero (meta atingida)

#### Previsão do Dia
- Projeta seu lucro ao final do turno (18h por padrão)
- Baseado no ritmo atual
- Cores: Verde (vai bater), Amarelo (difícil), Vermelho (improvável)

### 3. Barra de Progresso Visual

- Mostra percentual de progresso da meta (0-100%)
- Cores dinâmicas:
  - 🟢 **Verde**: Meta atingida (100%+)
  - 🟡 **Amarelo**: Bom progresso (75-99%)
  - 🔵 **Azul**: Progresso regular (50-74%)
  - 🟣 **Roxo**: Começando (0-49%)

### 4. Sistema de Alertas Automáticos

#### ✅ Meta Atingida
```
🎉 Meta Atingida!
Parabéns! Você atingiu sua meta diária.
```

#### 📊 Faltam Horas
```
⏰ Faltam Horas
Faltam R$120,00 para sua meta. Você consegue em ~2h!
```

#### ⚠️ Prejuízo Detectado
```
⚠️ Prejuízo Detectado
Você está no prejuízo de R$50,00. Aumente o faturamento!
```

#### 📉 Performance Baixa
```
📉 Performance Baixa
Seu ganho/hora está abaixo da média. Aumente a intensidade!
```

#### 📈 Excelente Performance
```
📈 Excelente Performance
Seu ganho/hora está 20% acima da média!
```

### 5. Sugestões Inteligentes

O sistema analisa constantemente e sugere:

**Se meta foi atingida:**
> ✅ Meta atingida! Bom trabalho. Pode parar quando quiser.

**Se ainda em prejuízo:**
> ⚠️ Você está em prejuízo hoje. Não recomendamos parar agora.

**Se consegue bater em poucas horas:**
> 📊 Você consegue bater a meta em ~2h. Continue!

**Se performance está baixa:**
> ⚠️ Difícil bater a meta com este ritmo. Aumente a intensidade!

**Caso contrário:**
> 📈 Ritmo bom! Continue trabalhando.

### 6. Parar o Turno

Clique em **"Parar Turno"** quando terminar:
- O modo desativa
- Alertas são limpos
- Você ainda pode registrar rotas manualmente
- Dados permanecem salvos

## 🎯 Exemplos de Uso

### Exemplo 1: Atingindo a Meta Cedo

```
09:00 - Inicia turno
       - Meta diária: R$ 200,00
       
10:30 - Registra 2 rotas (R$ 80,00)
       - Ganho/hora: R$ 53,00
       - Faltam: R$ 120,00
       - Previsão: R$ 390,00 ✅
       - Alerta: "Você consegue em ~2h!"

13:00 - Registra 4 rotas (R$ 210,00 total)
       - Ganho/hora: R$ 58,50
       - Lucro: R$ 210,00
       - Status: ✅ META ATINGIDA
       - Sugestão: "Pode parar quando quiser!"
```

### Exemplo 2: Ritmo Baixo

```
09:00 - Inicia turno
       - Meta diária: R$ 150,00
       
12:00 - Registra 1 rota (R$ 45,00)
       - Ganho/hora: R$ 15,00
       - Faltam: R$ 105,00
       - Previsão: R$ 135,00 (difícil)
       - Alerta: "Aumente a intensidade!"

15:00 - Registra 3 rotas (R$ 150,00 total)
       - Ganho/hora: R$ 25,00
       - Status: ✅ META ATINGIDA
       - Melhoria: +66% no ritmo
```

### Exemplo 3: Prejuízo

```
09:00 - Inicia turno
       - Custo diário: R$ 40,00
       - Meta: R$ 150,00

11:00 - Nenhuma rota (R$ 0,00)
       - Alerta: "⚠️ Prejuízo Detectado"
       - Mensagem: "Você está no prejuízo de R$40,00"

13:00 - Registra 2 rotas (R$ 80,00)
       - Lucro: R$ 40,00
       - Sem prejuízo agora
       - Alerta desaparece
```

## 🔄 Como Funciona a Atualização

1. **A cada 30 segundos** (automático):
   - Sistema busca todas as rotas de hoje
   - Recalcula lucro, ganho/hora, previsão
   - Avalia status da meta
   - Gera alertas relevantes
   - Renderiza a UI

2. **Quando você registra uma rota**:
   - Rota é salva no banco
   - `renderAll()` é chamado
   - UI é atualizada (não espera 30 segundos)

3. **Cores mudam dinamicamente**:
   - Conforme o percentual de progresso muda
   - Conforme status (prejuízo/sucesso/progresso) muda

## 📱 Mobile-First

A UI é completamente responsiva:
- ✅ Funciona em smartphones
- ✅ Toque fácil nos botões
- ✅ Rolagem suave
- ✅ Tipografia grande e clara

## 🔌 Integração Técnica

### Estrutura de Código

```
state.trabalhoAtivo = {
  ativo: boolean,                    // Turno está ativo?
  inicioTurno: Date,                 // Quando começou
  lucroAtual: number,                // Lucro do dia
  metaDiaria: number,                // Meta do dia
  faltaParaMeta: number,             // Quanto falta
  ganhoPorHora: number,              // R$ por hora
  previsaoFinal: number,             // Projeção final
  rotasHoje: Array,                  // Rotas de hoje
  alertas: Array,                    // Alertas ativos
  ultimaAtualizacao: Date,           // Última atualização
  statusMeta: 'em-progresso'|'atingida'|'prejuizo',
  sugestao: Object                   // Sugestão inteligente
}
```

### Funções Principais

```javascript
// Iniciar turno
trabalhoAtivoManager.iniciarTurno(metaDiaria);

// Parar turno
trabalhoAtivoManager.pararTurno();

// Obter estado atual
trabalhoAtivoManager.obterEstado();

// Obter alertas
trabalhoAtivoManager.obterAlertas();

// Remover alerta
trabalhoAtivoManager.removerAlerta(alertaId);

// Subscribe para atualizações
trabalhoAtivoManager.subscribe((estado) => {
  console.log('Nova atualização:', estado);
});
```

### Performance

- ✅ Sem `innerHTML` - usa `createElement` e métodos DOM seguros
- ✅ Atualização otimizada - apenas 30s interval
- ✅ Sem memory leaks - cleanup no `pararTurno()`
- ✅ Pronto para produção - validação de dados

## 🚨 Debugging

Se quiser ver o estado completo:

```javascript
// No console do navegador
console.log(state.trabalhoAtivo);
```

Para simular uma rota:

```javascript
// Salve uma rota normalmente via UI
// O sistema detecta automaticamente e atualiza
```

## 🎨 Customização Futura

Você pode estender com:

- Notificações push quando meta é atingida
- Som de alerta
- Relatório do turno em PDF
- Histórico de alertas
- Integração com API de analytics

## ❓ FAQ

**P: A meta diária é sempre meta mensal / 30?**
R: Sim, por padrão. Você pode alterar manualmente ao iniciar (próxima versão).

**P: Que horas termina o turno por padrão?**
R: 18h (às 6 da tarde). Configurável no código (`calcularPrevisaoFinal`).

**P: Os alertas soam?**
R: Não, apenas visuais. Você pode adicionar som.

**P: Posso pausar o turno?**
R: Não, apenas parar completamente. A próxima versão pode ter pausa.

**P: Funciona offline?**
R: Sim! As rotas são salvas offline e sincronizadas depois.

---

**Desenvolvido com ❤️ para maximizar sua produtividade!**
