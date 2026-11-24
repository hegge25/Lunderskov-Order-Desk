import { STAGES, TARGETS, stepsFor } from '../config/process.js';

const DAY = 86400000;
const stageIndex = (key) => STAGES.findIndex((s) => s.key === key);

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}
export function addWorkingDays(date, n) {
  const d = startOfDay(date);
  let left = Math.ceil(n - 1e-9);
  while (left > 0) {
    d.setTime(d.getTime() + DAY);
    if (!isWeekend(d)) left--;
  }
  return d;
}
export function workingDaysBetween(a, b) {
  const d = startOfDay(a);
  const end = startOfDay(b);
  let n = 0;
  while (d < end) {
    d.setTime(d.getTime() + DAY);
    if (!isWeekend(d)) n++;
  }
  return n;
}

// Plan an order: each step gets start/end offsets in working days from the enquiry date.
// Active steps that have overrun are stretched to today, and later steps are re-forecast.
// A step marked `par` runs alongside the step before it (E4 next to E2).
export function schedule(order, cls, variant = 'TO-BE', today = new Date()) {
  const steps = stepsFor(variant, cls, order.channel);
  const created = new Date(order.created);
  const now = workingDaysBetween(created, today);
  const active = stageIndex(order.stage);
  const delivered = order.stage === 'done';
  let cursor = 0;
  let late = false;
  let activeSeen = false;
  let prev = { start: 0, seen: false };
  const planned = steps.map((s, idx) => {
    const si = stageIndex(s.stage);
    const start = s.par ? prev.start : cursor;
    const seen = s.par ? prev.seen : activeSeen;
    let end = start + s.days;
    let status;
    if (delivered || si < active) status = 'done';
    else if (si === active && !seen) {
      const lastInStage = !steps.slice(idx + 1).some((n) => n.stage === s.stage && !n.par);
      if (end < now && !lastInStage) status = 'done';
      else {
        status = 'active';
        activeSeen = true;
        if (end < now) { end = now + 0.5; status = 'late'; late = true; }
      }
    } else status = 'upcoming';
    prev = { start, seen };
    cursor = Math.max(cursor, end);
    return { ...s, start, end, status };
  });
  const total = cursor;

  const stages = STAGES.map((st, i) => {
    const mine = planned.filter((p) => p.stage === st.key);
    if (!mine.length) return { ...st, days: 0, start: 0, end: 0, status: 'upcoming', steps: [] };
    const start = mine[0].start;
    const end = Math.max(...mine.map((m) => m.end));
    let status = 'upcoming';
    if (delivered || i < active) status = 'done';
    else if (i === active) status = mine.some((m) => m.status === 'late') ? 'late' : 'active';
    return {
      ...st, steps: mine, start, end, days: end - start, status,
      endDate: addWorkingDays(created, end),
    };
  });

  // R1 and R2: planned working days of the stages each target covers
  const targets = Object.fromEntries(Object.entries(TARGETS).map(([k, t]) => {
    const mine = stages.filter((st) => t.stages.includes(st.key) && st.steps.length);
    const days = mine.length ? mine[mine.length - 1].end - mine[0].start : 0;
    return [k, { ...t, days, limit: t.days[cls], met: days <= t.days[cls] + 1e-9 }];
  }));

  return {
    variant, cls, steps: planned, stages, total, now, late, targets,
    created,
    delivery: addWorkingDays(created, total),
    dateAt: (offset) => addWorkingDays(created, offset),
  };
}

export const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtDays = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} d`;
