export const dkk = (v) => {
  if (v >= 1e6) return `DKK ${(v / 1e6).toFixed(2)} M`;
  if (v >= 1e3) return `DKK ${Math.round(v / 1e3)} k`;
  return `DKK ${Math.round(v)}`;
};
export const num = (v, d = 0) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : vals[i] ?? '') : ''), '');
