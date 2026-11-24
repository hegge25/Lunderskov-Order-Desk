// Fictional demo orders. Dates are relative to today so the board always looks live.
import { addWorkingDays } from '../engine/timeline.js';

const ago = (n) => {
  // n working days before today
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d.toISOString();
};

const full = {
  inletShape: 'Round', inletSize: 400, inletHeight: 2,
  doorDiameter: 600, doorHeight: 1, doorAngle: 0,
  ladders: [{ type: 'With Back Support at Top', angle: 270 }],
  platforms: [{ type: 'Top Platform', arc: 180, width: 1 }],
};
const L = (type, angle) => ({ type, angle });
const P = (type, arc = 180, width = 1) => ({ type, arc, width });

export function seedOrders() {
  return [
    {
      id: 'LC-2026-0412', customer: 'Nordvarme A/S', project: 'Biomass boiler line 3',
      contact: 'Mette Lund', created: ago(2), stage: 'quote', channel: 'sales',
      config: { ...full, flowRate: 30, flueTemp: 520, medium: 'Biomass', site: 'DK-Kolding', ladders: null, platforms: null },
    },
    {
      id: 'LC-2026-0409', customer: 'Hanse BioEnergie GmbH', project: 'Waste-to-energy stack',
      contact: 'Jonas Kragh', created: ago(16), stage: 'design', channel: 'sales',
      config: { ...full, flowRate: 50, flueTemp: 620, medium: 'Waste Incineration', site: 'DE-Munchen', ladders: [L('With Back Support in all Length', 270)], platforms: [P('Measuring Platform', 360)] },
    },
    {
      id: 'LC-2026-0405', customer: 'Fjordvarme AS', project: 'Oil peak-load boiler',
      contact: 'Mette Lund', created: ago(20), stage: 'production', channel: 'web',
      config: { ...full, flowRate: 15, flueTemp: 600, medium: 'Oil', site: 'NO-Bergen', ladders: [L('With Safety Harness', 180)], platforms: [P('Top Platform', 120)] },
    },
    {
      id: 'LC-2026-0414', customer: 'Øresund Kraft AB', project: 'Gas engine plant',
      contact: 'Sara Holm', created: ago(0), stage: 'quote', channel: 'web',
      config: { ...full, flowRate: 12, flueTemp: 400, medium: 'Natural Gas', site: 'SE-Malmo', inletShape: 'Square', inletSize: 300, ladders: [L('Standard Ladder', 270)], platforms: [] },
    },
    {
      id: 'LC-2026-0401', customer: 'Bałtyk Ciepło Sp. z o.o.', project: 'Coal unit retrofit',
      contact: 'Jonas Kragh', created: ago(26), stage: 'delivery', channel: 'sales',
      config: { ...full, flowRate: 45, flueTemp: 800, medium: 'Coal', site: 'PL-Gdansk', ladders: [L('With Back Support in all Length', 270)], platforms: [P('Service Platform', 360, 1.5)] },
    },
    {
      id: 'LC-2026-0410', customer: 'Rijnmond Afvalenergie BV', project: 'Line 2 replacement',
      contact: 'Sara Holm', created: ago(10), stage: 'design', channel: 'web',
      config: { ...full, flowRate: 38, flueTemp: 560, medium: 'Waste Incineration', site: 'NL-Rotterdam', ladders: [L('With Back Support at Top', 180)], platforms: [P('Top Platform')] },
    },
    {
      id: 'LC-2026-0413', customer: 'Vejle Papirfabrik', project: 'Drying hall exhaust',
      contact: 'Mette Lund', created: ago(4), stage: 'order', channel: 'web',
      config: { ...full, flowRate: 22, flueTemp: 430, medium: 'Gas', site: 'DK-Aarhus', ladders: [L('Standard Ladder', 270)], platforms: [] },
    },
    {
      id: 'LC-2026-0396', customer: 'Pohjola Lämpö Oy', project: 'District heating, Oulu',
      contact: 'Sara Holm', created: ago(45), stage: 'done', channel: 'sales',
      config: { ...full, flowRate: 18, flueTemp: 540, medium: 'Biomass', site: 'FI-Oulu', platforms: [P('Top Platform', 90)] },
    },
    {
      id: 'LC-2026-0415', customer: 'Kystkraft ApS', project: 'Harbour boiler, special site',
      contact: 'Jonas Kragh', created: ago(2), stage: 'quote', channel: 'web',
      config: { ...full, flowRate: 58, flueTemp: 480, medium: 'Biomass', site: 'OTHER', ladders: [L('With Back Support at Top', 180)], platforms: [P('Top Platform', 180, 2)] },
    },
  ];
}

export function newOrderConfig() {
  return {
    flowRate: 25, flueTemp: 500, medium: 'Biomass', site: 'DK-Kolding',
    inletShape: 'Round', inletSize: 300, inletHeight: 2,
    doorDiameter: 600, doorHeight: 1, doorAngle: 0,
    ladders: null,
    platforms: null,
  };
}

export { addWorkingDays };
