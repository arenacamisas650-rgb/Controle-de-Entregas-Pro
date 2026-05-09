export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
export const clear = (node) => { if (node) while (node.firstChild) node.removeChild(node.firstChild); };
export const el = (tag, options = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.flat().forEach((child) => { if (child != null) node.append(child.nodeType ? child : document.createTextNode(String(child))); });
  return node;
};
export const renderEmpty = (container, message) => { clear(container); container.append(el('div', { className: 'empty-state' }, [el('p', { text: message })])); };
export const showToast = (() => {
  let timer;
  return (message, type = '') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`.trim();
    clearTimeout(timer);
    timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
  };
})();
