import { validateConfig, validateImportPayload, validatePaymentKey, validateRoute, validateVale } from './validators.js';

const DB_NAME = 'entrega-pro-db', DB_VERSION = 1;
const COLLECTIONS = ['rotas', 'vales', 'pagamentos', 'config', 'empresas', 'syncQueue'];
let connection;

const openDB = () => connection || (connection = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    COLLECTIONS.forEach((name) => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' }); });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
}));
const waitReq = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const waitTx = (tx) => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
const storeFor = async (collection, mode = 'readonly') => { const db = await openDB(); const tx = db.transaction(collection, mode); return { tx, store: tx.objectStore(collection) }; };

const normalizeRecord = (collection, data) => {
  if (collection === 'rotas') return validateRoute(data);
  if (collection === 'vales') return validateVale(data);
  if (collection === 'pagamentos') return { id: validatePaymentKey(data.id || data), value: validatePaymentKey(data.id || data) };
  if (collection === 'config') return { id: 'app', ...validateConfig(data) };
  if (collection === 'empresas') return { id: String(data.id || data.nome || data).trim(), nome: String(data.nome || data.id || data).trim() };
  if (collection === 'syncQueue') return { ...data, id: data.id || crypto.randomUUID(), createdAt: data.createdAt || new Date().toISOString() };
  return data;
};

export const DB = {
  async save(collection, data) {
    const records = Array.isArray(data) ? data : [data];
    const { tx, store } = await storeFor(collection, 'readwrite');
    records.forEach((record) => store.put(normalizeRecord(collection, record)));
    await waitTx(tx);
    return data;
  },
  async get(collection) { const { store } = await storeFor(collection); return waitReq(store.getAll()); },
  async remove(collection, id) { const { tx, store } = await storeFor(collection, 'readwrite'); store.delete(id); await waitTx(tx); },
  async clear(collection) { const { tx, store } = await storeFor(collection, 'readwrite'); store.clear(); await waitTx(tx); },
  async replace(collection, records) { const { tx, store } = await storeFor(collection, 'readwrite'); store.clear(); records.forEach((r) => store.put(normalizeRecord(collection, r))); await waitTx(tx); },
};

export const loadSnapshot = async () => {
  const [rotas, vales, pagamentos, configRows, empresas, pendentes] = await Promise.all(['rotas', 'vales', 'pagamentos', 'config', 'empresas', 'syncQueue'].map((c) => DB.get(c)));
  return { rotas, vales, pagamentos: pagamentos.map((p) => p.value || p.id), config: configRows.find((r) => r.id === 'app') || {}, empresas: empresas.map((e) => e.nome || e.id), pendentes };
};

export const persistSnapshot = async (s) => Promise.all([
  DB.replace('rotas', s.rotas || []),
  DB.replace('vales', s.vales || []),
  DB.replace('pagamentos', (s.pagamentos || []).map((id) => ({ id, value: id }))),
  DB.replace('empresas', (s.empresas || []).map((nome) => ({ id: nome, nome }))),
  DB.replace('config', [{ id: 'app', ...(s.config || {}) }]),
  DB.replace('syncQueue', s.pendentes || []),
]);

export const migrateFromLocalStorage = async () => {
  if (localStorage.getItem('ep_migrated_indexeddb') === '1') return;
  const legacy = {
    rotas: JSON.parse(localStorage.getItem('ep_rotas') || localStorage.getItem('controleEntregas_rotas') || '[]'),
    vales: JSON.parse(localStorage.getItem('ep_vales') || localStorage.getItem('controleEntregas_vales') || '[]'),
    pagamentosAjudanteFeitos: JSON.parse(localStorage.getItem('ep_pagamentos') || '[]'),
    empresas: JSON.parse(localStorage.getItem('ep_empresas') || '[]'),
    config: { custoPorKm: localStorage.getItem('ep_custokm') || 0, consumoVeiculo: localStorage.getItem('ep_consumo') || '', precoCombustivel: localStorage.getItem('ep_combustivel') || '' },
  };
  if (legacy.rotas.length || legacy.vales.length || legacy.pagamentosAjudanteFeitos.length || legacy.empresas.length) await persistSnapshot(validateImportPayload(legacy));
  localStorage.setItem('ep_migrated_indexeddb', '1');
};
