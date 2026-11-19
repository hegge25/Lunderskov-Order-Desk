// Process steps behind the progress strip. Durations are in working days.
// PLACEHOLDER: the TO-BE steps will be replaced when the report's TO-BE process is settled.
// The AS-IS steps follow the case (pp. 6–7), using the midpoint of each stated range.

export const STAGES = [
  { key: 'enquiry',    label: 'Enquiry' },
  { key: 'quote',      label: 'Quotation' },
  { key: 'order',      label: 'Order' },
  { key: 'spec',       label: 'Specification' },
  { key: 'design',     label: 'Design' },
  { key: 'production', label: 'Production' },
  { key: 'delivery',   label: 'Delivery' },
];

export const PROCESS = {
  'TO-BE': {
    CTO: [
      { stage: 'enquiry',    label: 'Enquiry entered in configurator', owner: 'Sales',         days: 0.5 },
      { stage: 'quote',      label: 'Configured quotation',            owner: 'Sales',         days: 0.5 },
      { stage: 'order',      label: 'Customer decision',               owner: 'Customer',      days: 8, wait: true },
      { stage: 'spec',       label: 'Complete specification (gate)',   owner: 'Sales',         days: 0.5 },
      { stage: 'design',     label: 'Generated design & BOM',          owner: 'Configurator',  days: 0.5 },
      { stage: 'design',     label: 'Design check & release',          owner: 'Designer',      days: 1 },
      { stage: 'production', label: 'Production planning',             owner: 'Planning',      days: 1 },
      { stage: 'production', label: 'Fabrication',                     owner: 'Factory',       days: 12 },
      { stage: 'delivery',   label: 'Transport & installation',        owner: 'Site team',     days: 5 },
    ],
    ETO: [
      { stage: 'enquiry',    label: 'Enquiry entered in configurator', owner: 'Sales',         days: 0.5 },
      { stage: 'quote',      label: 'Configured base + engineering estimate', owner: 'Sales / Designer', days: 1.5 },
      { stage: 'order',      label: 'Customer decision',               owner: 'Customer',      days: 8, wait: true },
      { stage: 'spec',       label: 'Complete specification (gate)',   owner: 'Sales',         days: 1 },
      { stage: 'design',     label: 'Generated design for standard modules', owner: 'Configurator', days: 0.5 },
      { stage: 'design',     label: 'Engineer deviating modules',      owner: 'Designer',      days: 6.5 },
      { stage: 'design',     label: 'Design review & release',         owner: 'Designer',      days: 1 },
      { stage: 'production', label: 'Production planning',             owner: 'Planning',      days: 2 },
      { stage: 'production', label: 'Fabrication',                     owner: 'Factory',       days: 15 },
      { stage: 'delivery',   label: 'Transport & installation',        owner: 'Site team',     days: 5 },
    ],
  },
  'AS-IS': [
    { stage: 'enquiry',    label: 'Receive & clarify enquiry',          owner: 'Sales',          days: 2.5 },
    { stage: 'quote',      label: 'Management reads & accepts',         owner: 'Management',     days: 2 },
    { stage: 'quote',      label: 'Rough design from spreadsheets',     owner: 'Design',         days: 2.5 },
    { stage: 'quote',      label: 'Adapt & set selling price',          owner: 'Sales',          days: 2 },
    { stage: 'order',      label: 'Customer decision',                  owner: 'Customer',       days: 8, wait: true },
    { stage: 'spec',       label: 'Clarify customer requirements',      owner: 'Designer A',     days: 5.5 },
    { stage: 'design',     label: 'Obtain local building regulations',  owner: 'Local Authority', days: 4, wait: true },
    { stage: 'design',     label: 'Obtain emission regulations',        owner: 'Env. Agency',    days: 3.5, wait: true },
    { stage: 'design',     label: 'Capacity calculations',              owner: 'Designer A',     days: 3 },
    { stage: 'design',     label: 'Thermal analysis, insulation, fans', owner: 'Designer B',     days: 2.5 },
    { stage: 'design',     label: 'Specify filtering',                  owner: 'Designer C',     days: 1.5 },
    { stage: 'design',     label: 'Main dimensioning',                  owner: 'Designer D',     days: 2 },
    { stage: 'design',     label: 'Detail dimensioning',                owner: 'Designer E',     days: 4 },
    { stage: 'production', label: 'Production planning',                owner: 'Planning',       days: 3 },
    { stage: 'production', label: 'Fabrication',                        owner: 'Factory',        days: 15 },
    { stage: 'delivery',   label: 'Transport & installation',           owner: 'Site team',      days: 5 },
  ],
};

export function stepsFor(variant, cls) {
  return variant === 'AS-IS' ? PROCESS['AS-IS'] : PROCESS['TO-BE'][cls];
}
