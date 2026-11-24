// Process steps behind the progress strip. Durations are in working days.
//
// TO-BE: the report's recommended quotation scenario 2 (web configurator, salesperson verifies the
// site before the binding quotation) and the split order and design process: CTO steps C1–C6 and
// ETO steps E1–E8, as in the report's swimlanes (Attachments TO-BE CTO / ETO). E4 runs in parallel
// with E2. TO-BE durations are our assumptions, sized to the targets R1 (quotation ≤ 2 d) and
// R2 (CTO design ≤ 2 d, ETO ≤ 2 weeks) in the report's requirements (§3.2).
//
// AS-IS: the case, pp. 6–7, using the midpoint of each stated range. `ref` holds the numbers of the
// 17 highlighted steps in Appendix 3, so a PVM attribute can light up the steps that use it.

export const STAGES = [
  { key: 'enquiry',    label: 'Enquiry' },
  { key: 'quote',      label: 'Quotation' },
  { key: 'order',      label: 'Decision' },
  { key: 'design',     label: 'Design' },
  { key: 'production', label: 'Production' },
  { key: 'delivery',   label: 'Delivery' },
];

// The case's targets, as requirements R1 and R2 in the report (§3.2).
export const TARGETS = {
  R1: { label: 'R1 quotation', stages: ['enquiry', 'quote'], days: { CTO: 2, ETO: 2 }, text: 'A quotation is ready within 1–2 days' },
  R2: { label: 'R2 design', stages: ['design'], days: { CTO: 2, ETO: 10 }, text: 'CTO orders designed within 2 days, ETO within 2 weeks' },
};

const ENQUIRY = {
  web: {
    CTO: [{ stage: 'enquiry', label: 'Customer configures online: budget price and standard drawing', owner: 'Customer · web configurator', days: 0.1, auto: true }],
    ETO: [
      { stage: 'enquiry', label: 'Customer configures online, outside the PVM intervals', owner: 'Customer · web configurator', days: 0.1, auto: true },
      { stage: 'enquiry', label: 'Clarify the special request with the customer', owner: 'Salesperson', days: 0.4 },
    ],
  },
  sales: {
    CTO: [{ stage: 'enquiry', label: 'Structured enquiry with the customer', owner: 'Salesperson · sales configurator', days: 0.5 }],
    ETO: [{ stage: 'enquiry', label: 'Structured enquiry with the customer', owner: 'Salesperson · sales configurator', days: 0.5 }],
  },
};

const TOBE = {
  CTO: [
    { stage: 'quote', label: 'Verify local requirements, wind profile and installation', owner: 'Salesperson', days: 0.5 },
    { stage: 'quote', label: 'Recalculate with verified data, send binding quotation', owner: 'Sales configurator', days: 0.25, auto: true },
    { stage: 'order', label: 'Customer decision', owner: 'Customer', days: 8, wait: true },
    { stage: 'design', ref: 'C1', label: 'Release configured specification', owner: 'Salesperson', days: 0.25 },
    { stage: 'design', ref: 'C2', label: 'Capacity, heat loss and emission: H, d, N, material, insulation, fans, filters', owner: 'Order configurator', days: 0.05, auto: true },
    { stage: 'design', ref: 'C3', label: 'Strength from wind profile: wall thickness, plates, supports', owner: 'Order configurator', days: 0.05, auto: true },
    { stage: 'design', ref: 'C4', label: 'Detail parts: ladder, platform, gas inlet, cleaning door', owner: 'Order configurator', days: 0.05, auto: true },
    { stage: 'design', ref: 'C5', label: 'Generate part list, drawings and order documents', owner: 'Order configurator', days: 0.1, auto: true },
    { stage: 'design', ref: 'C6', label: 'Check configured design', owner: 'Designer', days: 1 },
    { stage: 'production', label: 'Project planning', owner: 'Project planning', days: 1 },
    { stage: 'production', label: 'Fabrication', owner: 'Factory', days: 12 },
    { stage: 'delivery', label: 'Transport and installation', owner: 'Site team', days: 5 },
  ],
  ETO: [
    { stage: 'quote', label: 'Management: quote the ETO request?', owner: 'Management', days: 0.25 },
    { stage: 'quote', label: 'Design non-standard attributes, estimate cost', owner: 'Design', days: 0.75 },
    { stage: 'quote', label: 'Verify site data, send binding quotation', owner: 'Salesperson · sales configurator', days: 0.5 },
    { stage: 'order', label: 'Customer decision', owner: 'Customer', days: 8, wait: true },
    { stage: 'design', ref: 'E1', label: 'Hand over complete specification to the design team', owner: 'Salesperson', days: 0.5 },
    { stage: 'design', ref: 'E2', label: 'Obtain building and emission regulations and wind profile', owner: 'Legislation department', days: 4, wait: true },
    { stage: 'design', ref: 'E4', par: true, label: 'Pre-select material from T_f and strength properties', owner: 'Design team A, B, D', days: 1 },
    { stage: 'design', ref: 'E3', label: 'Minimum height and filters for the emission level', owner: 'Designer C', days: 1 },
    { stage: 'design', ref: 'E5', label: 'Joint layout: H, d, N, material, insulation, fans within all height limits', owner: 'Design team A, B, D', days: 1.5 },
    { stage: 'design', ref: 'E6', label: 'Strength calculation, main parts and supports', owner: 'Design team A, B, D', days: 1 },
    { stage: 'design', ref: 'E7', label: 'Dimension ladder, platform, gas inlet and cleaning door', owner: 'Designer E', days: 1.5 },
    { stage: 'design', ref: 'E8', label: 'Check and release design', owner: 'Design team A, B, D', days: 0.5 },
    { stage: 'production', label: 'Project planning', owner: 'Project planning', days: 2 },
    { stage: 'production', label: 'Fabrication', owner: 'Factory', days: 15 },
    { stage: 'delivery', label: 'Transport and installation', owner: 'Site team', days: 5 },
  ],
};

const ASIS = [
  { stage: 'enquiry', label: 'Clarify the enquiry, prepare an internal enquiry', owner: 'Salesperson', days: 2.5 },
  { stage: 'quote', label: 'Read and approve the enquiry, plan the quotation', owner: 'Management', days: 2 },
  { stage: 'quote', label: 'Transfer data to a spreadsheet, rough design', owner: 'Design department', days: 2.5 },
  { stage: 'quote', label: 'Check the solution, set the price, write the quotation', owner: 'Salesperson', days: 2 },
  { stage: 'order', label: 'Customer decision', owner: 'Customer', days: 8, wait: true },
  { stage: 'design', ref: '1 2', label: 'Receive specifications, clarify questions', owner: 'Designer A', days: 3, wait: true },
  { stage: 'design', ref: '3', label: 'Calculate capacity requirements', owner: 'Designer A', days: 1.5 },
  { stage: 'design', ref: '', hl: 'loc', label: 'Obtain local building regulations', owner: 'Local authority', days: 4, wait: true },
  { stage: 'design', ref: '4', label: 'Re-calculate capacity (local requirements)', owner: 'Designer A', days: 0.5 },
  { stage: 'design', ref: '5 6 7', label: 'Material, insulation and heat loss, auxiliary fans', owner: 'Designer B', days: 2.5 },
  { stage: 'design', ref: '8', label: 'Re-calculate capacity (heat loss)', owner: 'Designer A', days: 0.5 },
  { stage: 'design', ref: '', hl: 'loc', label: 'Obtain emission regulations', owner: 'Environmental agency', days: 3.5, wait: true },
  { stage: 'design', ref: '9 10', label: 'Check emission requirements, apply filters', owner: 'Designer C', days: 1.5 },
  { stage: 'design', ref: '11', label: 'Re-calculate capacity (emission)', owner: 'Designer A', days: 0.5 },
  { stage: 'design', ref: '12 13 14 15', label: 'Wind profile, strength, main parts, structural support', owner: 'Designer D', days: 2 },
  { stage: 'design', ref: '16', label: 'Clarify questions: ladder and platform', owner: 'Designer E', days: 2.5, wait: true },
  { stage: 'design', ref: '17', label: 'Dimension detail parts', owner: 'Designer E', days: 4 },
  { stage: 'production', label: 'Production planning', owner: 'Project planning', days: 3 },
  { stage: 'production', label: 'Fabrication', owner: 'Factory', days: 15 },
  { stage: 'delivery', label: 'Transport and installation', owner: 'Site team', days: 5 },
];

export function stepsFor(variant, cls, channel = 'sales') {
  if (variant === 'AS-IS') return ASIS;
  return [...(ENQUIRY[channel] || ENQUIRY.sales)[cls], ...TOBE[cls]];
}

// What the strip's action button says at each stage, and whether the R3 gate applies there.
export const ACTIONS = {
  enquiry: { label: 'Start quotation' },
  quote: { label: 'Send binding quotation', gate: true },
  order: { label: 'Customer accepted', gate: true },
  design: { label: { CTO: 'Approve design (C6)', ETO: 'Release design (E8)' }, gate: true },
  production: { label: 'Ship to site' },
  delivery: { label: 'Close order' },
};
