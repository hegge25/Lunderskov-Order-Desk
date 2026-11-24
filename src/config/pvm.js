// Customer view of the Product Variant Master (Appendix 1).
// Intervals and options are copied from the PVM. A value outside them makes the order ETO.

export const MEDIA = {
  'Natural Gas':        { k: 4.8,  filter: 'A', mandatoryFilter: false, corrosive: false, soot: 0.10 },
  'Gas':                { k: 5.8,  filter: 'A', mandatoryFilter: false, corrosive: false, soot: 0.15 },
  'Oil':                { k: 8.8,  filter: 'B', mandatoryFilter: false, corrosive: false, soot: 0.45 },
  'Biomass':            { k: 11.2,  filter: 'C', mandatoryFilter: false, corrosive: true,  soot: 0.55 },
  'Coal':               { k: 13.6,  filter: 'D', mandatoryFilter: true,  corrosive: true,  soot: 0.85 },
  'Waste Incineration': { k: 16.0, filter: 'E', mandatoryFilter: true,  corrosive: true,  soot: 0.95 },
};

export const LADDER_TYPES = [
  'Standard Ladder',
  'With Safety Harness',
  'With Back Support at Top',
  'With Back Support in all Length',
];

export const PLATFORM_TYPES = ['Top Platform', 'Measuring Platform', 'Service Platform'];

// Field definitions. `eto` lists select values that fall outside the PVM.
export const FIELDS = {
  flowRate: {
    label: 'Flow rate', sym: 'Q', type: 'number', unit: 'm³/s',
    min: 10, max: 50, step: 1, pvm: 'Flue gas · Flow Rate [10–50] m³/s',
  },
  flueTemp: {
    label: 'Flue gas temperature', sym: 'T_f', type: 'number', unit: 'K',
    min: 373, max: 873, step: 5, pvm: 'Flue gas · Temperature [373–873] K',
    hint: (v) => `${Math.round(v - 273.15)} °C`,
  },
  medium: {
    label: 'Exhaust medium', type: 'select',
    options: [...Object.keys(MEDIA), 'Other'], eto: ['Other'],
    pvm: 'Exhaust medium · Emission components',
  },
  site: {
    label: 'Location', type: 'select', options: null /* filled from SITES */, eto: ['OTHER'],
    pvm: 'Local Requirements & Conditions · emission level, min/max height, wind profile',
  },
  inletShape: {
    label: 'Inlet shape', type: 'segmented', options: ['Round', 'Square'],
    pvm: 'Flue gas inlet · Inlet [Round, Square]',
  },
  inletSize: {
    label: (c) => (c.inletShape === 'Square' ? 'Inlet width w' : 'Inlet diameter Ø'),
    type: 'number', unit: 'mm', min: 100, max: 500, step: 10,
    pvm: 'Flue gas inlet · Ø / w [100–500] mm',
  },
  inletHeight: {
    label: 'Inlet height h', type: 'number', unit: 'm', min: 1, max: 3, step: 0.1,
    pvm: 'Flue gas inlet · Height of inlet [1–3] m',
  },
  doorDiameter: {
    label: 'Door diameter', type: 'segmented', options: [200, 600, 800], unit: 'mm',
    pvm: 'Cleaning Door · Diameter [200; 600; 800] mm',
  },
  doorHeight: {
    label: 'Door height R', type: 'number', unit: 'm', min: 0.5, max: 2, step: 0.1,
    pvm: 'Cleaning Door · Height R [0,5–2] m',
  },
  doorAngle: {
    label: 'Door placed at', type: 'segmented', options: [0, 90, 180, 270], unit: '°',
    pvm: 'Cleaning Door · Placed [0; 90; 180; 270]°',
  },
  // Ladder and platform are optional parts. They are lists so "not specified yet" (null)
  // differs from "none" ([]); `max` is the PVM cardinality, [0;1] for both.
  ladders: {
    label: 'Safety ladder', type: 'list', item: 'ladder', noun: 'ladder', max: 1,
    pvm: 'Safety Ladder [0;1]',
  },
  platforms: {
    label: 'Platform', type: 'list', item: 'platform', noun: 'platform', max: 1,
    pvm: 'Platform [0, 1]',
  },
};

export const FIELD_GROUPS = [
  { id: 'flue', label: 'Flue gas', fields: ['flowRate', 'flueTemp', 'medium'] },
  { id: 'site', label: 'Location', fields: ['site'] },
  { id: 'inlet', label: 'Flue gas inlet', fields: ['inletShape', 'inletSize', 'inletHeight'] },
  { id: 'door', label: 'Cleaning door', fields: ['doorDiameter', 'doorHeight', 'doorAngle'] },
  { id: 'ladder', label: 'Safety ladder', fields: ['ladders'] },
  { id: 'platform', label: 'Platform', fields: ['platforms'] },
];

// Fields of one list item.
export const ITEM_FIELDS = {
  ladder: {
    type: { label: 'Type', type: 'select', options: LADDER_TYPES, pvm: 'Safety Ladder · type' },
    angle: { label: 'Placed at', type: 'segmented', options: [0, 90, 180, 270], unit: '°', pvm: 'Safety Ladder · Placed [0; 90; 180; 270]°' },
  },
  platform: {
    type: { label: 'Type', type: 'select', options: PLATFORM_TYPES, pvm: 'Platform · Top, Measuring or Service' },
    arc: { label: 'Arc', type: 'segmented', options: [90, 120, 180, 360], unit: '°', pvm: 'Platform · Degrees [90; 120; 180; 360]' },
    width: { label: 'Width', type: 'number', unit: 'm', min: 0.5, max: 2, step: 0.1, pvm: 'Platform · Width [0,5–2] m' },
  },
};

// Resolve a field key, including list item keys such as "platforms.1.width".
export function fieldDef(key) {
  const m = /^(\w+)\.(\d+)\.(\w+)$/.exec(key);
  if (!m) return FIELDS[key];
  return ITEM_FIELDS[FIELDS[m[1]].item][m[3]];
}
export function parseItemKey(key) {
  const m = /^(\w+)\.(\d+)\.(\w+)$/.exec(key);
  return m ? { list: m[1], index: Number(m[2]), prop: m[3] } : null;
}

// A sensible new item, avoiding positions that are already taken or blocked.
export function newItem(list, cfg) {
  const ladders = cfg.ladders || [];
  const platforms = cfg.platforms || [];
  if (list === 'ladders') {
    const taken = new Set([...ladders.map((l) => l.angle), INLET_ANGLE, cfg.doorAngle]);
    const angle = [270, 180, 0, 90].find((a) => !taken.has(a)) ?? 270;
    return { type: 'Standard Ladder', angle };
  }
  const used = new Set(platforms.map((p) => p.type));
  const type = PLATFORM_TYPES.find((t) => !used.has(t)) || 'Service Platform';
  return { type, arc: 180, width: 1 };
}

// The flue gas inlet always faces the customer's plant (90°). Not a PVM option.
export const INLET_ANGLE = 90;
