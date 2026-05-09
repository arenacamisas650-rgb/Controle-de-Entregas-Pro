import { state } from '../state.js';
import { calcularGasto, calcularLucro, filtrarRotasPorMes, formatarData, formatarMoeda, obterMesAnoFiltrado } from '../calculations.js';
import { clear, el, renderEmpty, setText } from './dom.js';

export const renderizarHistorico = (onExcluirRota) => {
  const { ano, mes } = obterMesAnoFiltrado();
  const nome = new Date(ano, mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const rotas = filtrarRotasPorMes(state.rotas, ano, mes).sort((a, b) => new Date(b.data) - new Date(a.data));
  const c = document.getElementById('listaRotas');
  setText('tituloTabelaRotas', nome); setText('badgeRotas', rotas.length); clear(c);
  if (!rotas.length) { renderEmpty(c, `Nenhuma rota em ${nome}`); return; }
  rotas.forEach((r) => {
    const lucro = calcularLucro(r), gasto = calcularGasto(r);
    const meta = el('div', { className: 'route-item-meta' }, [el('span', { text: `Valor ${formatarMoeda(r.valor)}` }), el('span', { text: `${r.km} km` })]);
    if (gasto > 0) meta.append(el('span', { text: `Custos ${formatarMoeda(gasto)}` }));
    if (Number(r.ajudante || 0) > 0) meta.append(el('span', { text: `Ajudante ${formatarMoeda(r.ajudante)}` }));
    if (Number(r.qtdEntregas || 0) > 0) meta.append(el('span', { text: `${r.qtdEntregas} entregas` }));
    c.append(el('div', { className: 'route-item' }, [
      el('div', { className: 'route-item-header' }, [el('div', {}, [el('div', { className: 'route-item-empresa', text: r.empresa }), el('div', { className: 'route-item-data', text: `${formatarData(r.data)}${r.duracao ? ` - ${r.duracao}min` : ''}` })]), el('div', { className: `route-item-profit ${lucro >= 0 ? 'green' : 'red'}`, text: formatarMoeda(lucro) })]),
      meta,
      el('button', { className: 'route-delete', text: 'Excluir', onclick: () => onExcluirRota(r.id) }),
    ]));
  });
};
