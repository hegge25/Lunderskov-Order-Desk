// The link between the PVM customer view and the process, from the report (task 1.2 and 3.2):
// the ASIS columns (Appendix B, build_asis.py) and the TOBE columns (tobe_map.txt) of the PVM.
// `asis` are the Appendix 3 steps that use the attribute, `set` the steps that establish it today.
// CTO and ETO are the TO-BE steps that use it; in the TO-BE process every one is set in the quotation.
export const LINKS = {
  flowRate:  { asis: [3, 4, 6, 7, 8, 9, 10, 11], set: [1, 2], CTO: ['C2'], ETO: ['E3', 'E5'] },
  flueTemp:  { asis: [3, 4, 5, 6, 8, 11], set: [1, 2], CTO: ['C2'], ETO: ['E4', 'E5'] },
  medium:    { asis: [9, 10], set: [1], CTO: ['C2'], ETO: ['E3'] },
  site:      { asis: [4, 9, 10, 13, 15, 'loc'], set: [12], CTO: ['C2', 'C3'], ETO: ['E2', 'E3', 'E5', 'E6'] },
  inlet:     { asis: [17], set: [1], CTO: ['C4'], ETO: ['E7'] },
  door:      { asis: [17], set: [1], CTO: ['C4'], ETO: ['E7'] },
  ladders:   { asis: [17], set: [1, 16], CTO: ['C4'], ETO: ['E7'] },
  platforms: { asis: [17], set: [1, 16], CTO: ['C4'], ETO: ['E7'] },
};
// Fields that share a group's link
export const LINK_OF = {
  flowRate: 'flowRate', flueTemp: 'flueTemp', medium: 'medium', site: 'site',
  inletShape: 'inlet', inletSize: 'inlet', inletHeight: 'inlet',
  doorDiameter: 'door', doorHeight: 'door', doorAngle: 'door',
  ladders: 'ladders', platforms: 'platforms',
};
