import { seedOrders, newOrderConfig } from './data/seed.js';
import { STAGES } from './config/process.js';

const KEY = 'lunderskov-order-desk.v1';
let orders = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable */ }
  return seedOrders();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(orders)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export const store = {
  all: () => orders,
  get: (id) => orders.find((o) => o.id === id),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  setConfig(id, key, value) {
    const o = this.get(id);
    o.config[key] = value;
    save();
  },
  advance(id) {
    const o = this.get(id);
    const i = STAGES.findIndex((s) => s.key === o.stage);
    o.stage = i < 0 || i >= STAGES.length - 1 ? 'done' : STAGES[i + 1].key;
    save();
  },
  create() {
    const n = Math.max(...orders.map((o) => Number(o.id.split('-')[2]))) + 1;
    const o = {
      id: `LC-2026-${String(n).padStart(4, '0')}`,
      customer: 'New customer', project: 'New enquiry', contact: 'Mette Lund',
      created: new Date().toISOString(), stage: 'enquiry', config: newOrderConfig(),
    };
    orders.unshift(o);
    save();
    return o;
  },
  reset() {
    orders = seedOrders();
    save();
  },
};
