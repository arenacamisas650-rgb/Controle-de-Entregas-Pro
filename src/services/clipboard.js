// [MODULES] clipboard.js — importa do parser-endereco (fonte correta após refatoração)
import { extrairEnderecosInteligente, parseEndereco } from './parser-endereco.js';

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

  // Tenta extração inteligente multi-linha primeiro
  const resultado = extrairEnderecosInteligente(texto, 'amazon-flex-clipboard');
  if (resultado.enderecos.length) return { texto, ...resultado };

  // Fallback: trata o texto inteiro como candidato único
  const parse = parseEndereco(texto, 0, 'amazon-flex-clipboard');
  if (!parse.valido) {
    return { texto, enderecos: [], ignorados: [{ texto, motivo: parse.motivoDescarte || 'Score insuficiente' }] };
  }
  return {
    texto,
    enderecos: [{ ...parse, origem: 'amazon-flex-clipboard' }],
    ignorados: [],
    duplicados: [],
  };
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
