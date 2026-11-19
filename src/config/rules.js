// Dummy regulation and engineering tables. Not real data: they only need to behave plausibly.

// Local requirements per site: wind zone, building regulation height limits, emission strictness.
export const SITES = {
  'DK-Kolding':   { label: 'Kolding, DK',    country: 'DK', wind: 2, alpha: 0.16, minH: 12, maxH: 90,  emis: 1.00, coastal: false, T0: 293 },
  'DK-Esbjerg':   { label: 'Esbjerg, DK',    country: 'DK', wind: 4, alpha: 0.12, minH: 12, maxH: 110, emis: 1.00, coastal: true,  T0: 291 },
  'DK-Aarhus':    { label: 'Aarhus, DK',     country: 'DK', wind: 3, alpha: 0.22, minH: 15, maxH: 60,  emis: 1.05, coastal: false,  T0: 293 },
  'DE-Hamburg':   { label: 'Hamburg, DE',    country: 'DE', wind: 3, alpha: 0.22, minH: 15, maxH: 75,  emis: 1.15, coastal: false, T0: 295 },
  'DE-Munchen':   { label: 'München, DE',    country: 'DE', wind: 1, alpha: 0.25, minH: 18, maxH: 55,  emis: 1.20, coastal: false, T0: 298 },
  'SE-Malmo':     { label: 'Malmö, SE',      country: 'SE', wind: 3, alpha: 0.16, minH: 12, maxH: 100, emis: 0.95, coastal: false,  T0: 292 },
  'NO-Bergen':    { label: 'Bergen, NO',     country: 'NO', wind: 4, alpha: 0.14, minH: 10, maxH: 120, emis: 0.90, coastal: true,  T0: 290 },
  'NL-Rotterdam': { label: 'Rotterdam, NL',  country: 'NL', wind: 4, alpha: 0.18, minH: 15, maxH: 85,  emis: 1.10, coastal: true,  T0: 293 },
  'PL-Gdansk':    { label: 'Gdańsk, PL',     country: 'PL', wind: 3, alpha: 0.16, minH: 10, maxH: 130, emis: 0.85, coastal: false,  T0: 294 },
  'FI-Oulu':      { label: 'Oulu, FI',       country: 'FI', wind: 2, alpha: 0.14, minH: 10, maxH: 140, emis: 0.90, coastal: false,  T0: 288 },
};
// A site outside the regulation database: regulations must be obtained by hand (ETO).
export const OTHER_SITE = { label: 'Other (not in database)', country: '??', wind: 3, alpha: 0.18, minH: 15, maxH: 150, emis: 1.10, coastal: false, T0: 293 };

export const WIND_ZONES = { 1: 22, 2: 24, 3: 27, 4: 30 }; // basic wind speed v_b [m/s] at 10 m

export const FILTERS = {
  A: { label: 'Type A · bag filter',        reduction: 0.15, price: 85000 },
  B: { label: 'Type B · cyclone + bag',     reduction: 0.25, price: 120000 },
  C: { label: 'Type C · electrostatic',     reduction: 0.35, price: 160000 },
  D: { label: 'Type D · wet scrubber',      reduction: 0.45, price: 210000 },
  E: { label: 'Type E · scrubber + carbon', reduction: 0.55, price: 240000 },
};

// Plate materials, from the PVM material table, plus dummy prices and densities.
export const MATERIALS = {
  'Corten Steel':    { k: 32, density: 7850, pricePerKg: 34, look: 'corten' },
  'Carbon Steel':    { k: 25, density: 7850, pricePerKg: 28, look: 'painted' },
  'Stainless Steel': { k: 12, density: 7900, pricePerKg: 62, look: 'stainless' },
  'Fiber Glass':     { k: 7,  density: 1900, pricePerKg: 85, look: 'fiberglass' },
};

// Insulation, from the PVM insulation table.
export const INSULATION = {
  'Rock Wool':          { k: 0.04, density: 110, pricePerM3: 2600 },
  'Insulating Bricks':  { k: 0.15, density: 1800, pricePerM3: 9500 },
  'Styrofoam':          { k: 0.01, density: 30, pricePerM3: 1400 },
};

export const CONSTANTS = {
  g: 9.81,
  C: 0.65,          // discharge coefficient
  gap: 0.05,        // clearance between liners and insulation [m]
  maxLinerD: 2.4,   // largest liner we roll [m]
  aviationH: 45,    // obstruction marking and lights above this height [m]
  hourRate: 950,    // engineering DKK/h
  margin: 0.22,
};
