import { extrairEnderecos, validarEndereco } from './ocr.js';

const intervaloPadrao = 1400;

export const clipboardDisponivel = () => Boolean(navigator.clipboard?.readText);

export const lerTextoClipboard = async () => {
  if (!clipboardDisponivel()) throw new Error('Clipboard nao disponivel neste navegador.');
  const texto = await navigator.clipboard.readText();
  return String(texto || '').trim();
};

export const detectarEnderecoNoClipboard = async () => {
  const texto = await lerTextoClipboard();
  if (!texto) return { texto: '', enderecos: [], ignorados: [] };

  const resultado = extrairEnderecos(texto);
  if (resultado.enderecos.length) return { texto, ...resultado };

  const validacao = validarEndereco({ enderecoCompleto: texto, origem: 'amazon-flex-clipboard' });
  if (!validacao.valido) return { texto, enderecos: [], ignorados: [{ texto, motivo: validacao.motivo }] };
  return { texto, enderecos: [{ ...validacao.endereco, origem: 'amazon-flex-clipboard' }], ignorados: [] };
};

export const iniciarCapturaClipboard = ({ onEndereco, onDuplicado, onIgnorado, onErro, intervalo = intervaloPadrao } = {}) => {
  let ativo = true;
  let ultimoTexto = '';
  let timer = null;

  const tick = async () => {
    if (!ativo) return;
    try {
      const resultado = await detectarEnderecoNoClipboard();
      if (resultado.texto && resultado.texto !== ultimoTexto) {
        ultimoTexto = resultado.texto;
        if (resultado.enderecos.length) {
          resultado.enderecos.forEach((endereco) => onEndereco?.(endereco));
        } else if (resultado.ignorados.length) {
          resultado.ignorados.forEach((item) => onIgnorado?.(item));
        } else {
          onDuplicado?.(resultado.texto);
        }
      }
    } catch (error) {
      ativo = false;
      onErro?.(error);
      return;
    }
    timer = setTimeout(tick, intervalo);
  };

  tick();

  return () => {
    ativo = false;
    if (timer) clearTimeout(timer);
  };
};
