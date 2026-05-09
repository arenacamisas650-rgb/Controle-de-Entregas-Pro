# Dashboard de Performance Semanal e Mensal

## 📊 Novo Recurso: Análise Inteligente de Desempenho

O **Dashboard de Performance** oferece uma visão completa e profunda da sua eficiência de trabalho, com insights automáticos para otimizar ganhos e identificar padrões.

---

## 🎯 Seções do Dashboard

### 1️⃣ **Performance do Período**

Mostra métricas consolidadas do mês filtrado:

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| **Lucro Total** | Soma de todos os lucros do período | R$ |
| **Média Diária** | Lucro dividido pelos dias trabalhados | R$/dia |
| **KM Total** | Distância total percorrida | km |
| **Entregas** | Quantidade total de entregas realizadas | unidades |

**Exemplo:**
```
Lucro Total: R$ 5.400,00 (em 20 dias)
Média Diária: R$ 270,00
KM Total: 3.200 km (160 km/dia em média)
Entregas: 540 entregas (27/dia em média)
```

---

### 2️⃣ **Eficiência (Ganhos por Métrica)**

Mostra seus ganhos decompostos em diferentes dimensões:

| Métrica | Fórmula | Uso |
|---------|---------|-----|
| **R$/Hora** | Lucro Total ÷ Horas Trabalhadas | Avaliar intensidade |
| **R$/KM** | Lucro Total ÷ KM Total | Eficiência de deslocamento |
| **R$/Entrega** | Lucro Total ÷ Total Entregas | Qualidade da entrega |
| **Horas Trabalhadas** | Soma de durações de rotas | Total de horas |

**Exemplo:**
```
R$/Hora: R$ 67,50     ← Excelente se > R$ 50
R$/KM: R$ 1,69        ← Bom se > R$ 1,50
R$/Entrega: R$ 10,00  ← Indica valor agregado
Horas: 80h total
```

**Interpretação:**
- 🟢 **R$/Hora > 50**: Está com bom ritmo
- 🟡 **R$/Hora 30-50**: Ritmo normal
- 🔴 **R$/Hora < 30**: Revise estratégia de horários

---

### 3️⃣ **Melhor vs Pior Dia da Semana**

Identifica os dias mais lucrativos:

**Melhor Dia (🏅)**
```
Segunda-feira
Ganho Médio: R$ 340,00
Trabalhado: 4 dias
```

**Pior Dia (📉)**
```
Domingo
Ganho Médio: R$ 120,00
Trabalhado: 3 dias
```

**Como Usar:**
- ✅ Trabalhe mais nos melhores dias
- ✅ Evite ou otimize os piores dias
- ✅ Revise horários nos dias fracos
- ✅ Considere descanso nos dias ruins

---

### 4️⃣ **Gráfico Semanal (Linha)**

Mostra a tendência de ganho médio por dia da semana em todo o histórico.

```
R$ 350 |     ╱╲
       |    ╱  ╲    ╱╲
R$ 300 |   ╱    ╲  ╱  ╲
       |  ╱      ╲╱    ╲
R$ 250 | ╱              ╲
       └─────────────────────
         Dom Seg Ter Qua Qui Sex Sab
```

**Interpretação:**
- 📈 Linha subindo = Dias com mais ganho potencial
- 📉 Linha caindo = Dias menos lucrativos
- 🟢 Pontos verdes = Dias com dados suficientes

---

### 5️⃣ **Insights Automáticos (💡)**

Sistema inteligente que detecta oportunidades:

#### 📊 **Abaixo da Meta**
```
Sua média diária (R$ 250,00) está abaixo da meta (R$ 300,00)
```
**Ação**: Aumentar número de rotas ou valor por rota

#### ⏰ **Ganho/Hora Baixo**
```
Seu ganho/hora (R$ 28,00) está abaixo do recomendado (R$ 30,00)
```
**Ação**: Trabalhar em horários mais movimentados ou aumentar eficiência

#### 📍 **Distância Alta**
```
Você tem rodado em média 210km por dia. Considere otimizar as rotas.
```
**Ação**: Agrupar rotas próximas, usar ferramenta de roteirização

#### 💰 **Ganho Alto por Entrega**
```
Sua média por entrega (R$ 12,50) está acima do esperado!
```
**Ação**: Manter o padrão, análise de clientes premium

---

## 📱 Exemplo Prático: Análise Semanal

### Segunda-feira é o Melhor Dia (🏅)

```
Ganho Médio: R$ 340,00
Dias Trabalhados: 4 vezes
Total Ganho Segunda: R$ 1.360,00

Análise:
- Mais clientes em compras pós-fim de semana
- Trânsito mais fluido pela manhã
- Pessoas com dinheiro de fim de semana
```

**Recomendação:**
> "Concentre mais rotas nas segundas-feiras para maximizar lucros"

### Domingo é o Pior Dia (📉)

```
Ganho Médio: R$ 120,00
Dias Trabalhados: 3 vezes
Total Ganho Domingo: R$ 360,00

Análise:
- Pontos de entrega fechados
- Menor movimento no comércio
- Pessoas menos dispostas a sair
```

**Recomendação:**
> "Evite domingos ou trabalhe apenas entregas importantes"

---

## 🔍 Como Interpretar os Dados

### Performance Ideal (Referência)

```
Lucro Total (30 dias): R$ 8.000,00
Média Diária: R$ 267,00
KM Total: 2.400 km
Entregas: 480
R$/Hora: R$ 55,00 ✅
R$/KM: R$ 3,33 ✅
R$/Entrega: R$ 16,67 ✅
```

### Performance Baixa (Alerta)

```
Lucro Total (30 dias): R$ 3.000,00
Média Diária: R$ 100,00
KM Total: 3.600 km
Entregas: 240
R$/Hora: R$ 20,00 ⚠️ (Baixo)
R$/KM: R$ 0,83 ⚠️ (Baixo)
R$/Entrega: R$ 12,50 ⚠️ (Baixo)
```

**Problemas Identificados:**
- Muitos KM, poucos ganhos → Otimizar rotas
- Poucos ganhos/entrega → Renegociar valores
- Poucas horas/dia → Trabalhar mais

---

## 📊 Funcionalidades Técnicas

### Cálculos Implementados

```javascript
// Análise de período (mês/semana/período)
calcularPerformancePeriodo(rotas, { ano, mes })
→ totalLucro, totalKm, totalHoras, totalEntregas
→ mediaDiaria, ganhoPorHora, ganhoPorKm, ganhoPorEntrega
→ diasMap (detalhado por data)

// Análise semanal (dia da semana)
calcularPerformanceSemanal(rotas)
→ Agrupa por domingo, segunda, ... sábado
→ Calcula média de ganho por dia

// Identifica melhor/pior
calcularMelhorEPiorDia(diasSemana)
→ Retorna dia com melhor média
→ Retorna dia com pior média

// Insights inteligentes
gerarInsightsPerformance(performance, config)
→ Detecta padrões automáticamente
→ Gera recomendações personalizadas
```

---

## 🎨 Visual e Cores

### Significado das Cores

| Cor | Significado |
|-----|------------|
| 🟢 Verde | Bom desempenho, meta atingida |
| 🔵 Azul | Informação, dados consolidados |
| 🟡 Amarelo | Aviso, ação necessária |
| 🔴 Vermelho | Crítico, desempenho ruim |

### Componentes Visuais

- **Cards**: Mostram um valor por métrica
- **Grid 2 colunas**: Aproveitam espaço no mobile
- **Gráfico Linha**: Tendência semanal visível
- **Badges/Pills**: Destaque para melhor/pior dia

---

## 💡 Dicas de Uso

### 1. Comparar Períodos
```
Mês Anterior: R$ 5.500,00 → Média R$ 193,00
Mês Atual: R$ 6.200,00 → Média R$ 206,00
Crescimento: +6,7% 📈
```

### 2. Identificar Padrões
```
Segunda a Quarta: R$ 300,00/dia (melhor)
Quinta a Sábado: R$ 200,00/dia (pior)
Razão: Movimentação menor na semana
```

### 3. Otimizar Gastos
```
Se R$/KM está baixo:
→ Rotas mais agrupadas
→ Reduzir distâncias vazias
→ Planejar melhor trajeto
```

### 4. Decisões de Horário
```
Se R$/Hora está baixo:
→ Trabalhar em horários de pico
→ Evitar madrugada/madrugada
→ Concentrar em horário comercial
```

---

## 🔄 Atualização de Dados

- ✅ **Automática**: Dashboard atualiza ao renderizar
- ✅ **Ao adicionar rota**: Recalcula imediatamente
- ✅ **Ao filtrar mês**: Mostra dados do período selecionado
- ✅ **Sem delays**: Cálculos otimizados

---

## 📱 Responsividade

- ✅ **Desktop**: Cards lado a lado (2 colunas)
- ✅ **Tablet**: Transição suave para 1 coluna
- ✅ **Mobile**: Empilhado com toque amigável
- ✅ **Gráfico**: Redimensiona automaticamente

---

## ❓ FAQ

**P: Como são calculadas as médias?**
R: Média = Total ÷ Número de dias trabalhados (não inclui dias sem trabalho)

**P: Por que meu ganho/hora está diferente do esperado?**
R: Inclui todo tempo de trabalho: aguardo, descanso, almoço (conforme registrado na duração da rota)

**P: Os insights são personalizados?**
R: Sim! Baseados na sua meta mensal e padrões reais de trabalho

**P: Posso comparar dois períodos?**
R: Não ainda, mas você pode anotarManual ou usar a exportação

**P: O gráfico mostra dados de um mês ou todos?**
R: Mostra agregação de TODOS os dados históricos (dias da semana em geral)

---

## 🚀 Próximas Melhorias

- [ ] Comparação entre períodos
- [ ] Relatórios em PDF
- [ ] Notificações de insights
- [ ] Metas personalizadas por dia da semana
- [ ] Previsão de ganho para o mês
- [ ] Análise de empresas mais lucrativas

---

**Desenvolvido para dar a você inteligência sobre seus ganhos! 📊💰**
