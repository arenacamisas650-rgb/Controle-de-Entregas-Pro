export const criarRelatorioDebug = (textoBruto, enderecos, ignorados, duplicados) => {
  console.groupCollapsed(`[DEBUG OCR] Relatório de Extração`);
  
  console.log('--- Texto Bruto (OCR) ---');
  console.log(textoBruto);
  
  console.log(`--- Endereços Válidos (${enderecos.length}) ---`);
  if (enderecos.length > 0) console.table(enderecos.map(e => ({ Rua: e.rua, Numero: e.numero, CEP: e.cep, Score: e.score })));
  else console.log('Nenhum endereço válido.');

  console.log(`--- Ignorados (${ignorados.length}) ---`);
  if (ignorados.length > 0) console.table(ignorados.map(e => ({ Texto: e.textoBruto?.substring(0,30), Motivo: e.motivoDescarte, Score: e.score })));
  
  console.log(`--- Duplicados (${duplicados.length}) ---`);
  if (duplicados.length > 0) console.table(duplicados.map(e => ({ Texto: e.enderecoCompleto, Motivo: 'Já adicionado' })));

  console.groupEnd();
};

export const calcularScoreMedio = (enderecos) => {
  if (!enderecos || enderecos.length === 0) return 0;
  const soma = enderecos.reduce((acc, curr) => acc + (curr.score || 0), 0);
  return Math.round(soma / enderecos.length);
};
