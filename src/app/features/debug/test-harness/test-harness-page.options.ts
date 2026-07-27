import { TeamStyleOption } from '../models/test-harness.model';

export const AUTO_PLAYER_SWAP_STARTER = '__AUTO_STARTER';
export const AUTO_PLAYER_SWAP_BENCH = '__AUTO_BENCH';

export const TEAM_STYLE_OPTIONS: readonly TeamStyleOption[] = [
  { value: 'BALANCED', label: 'Balanceado', hint: 'Sin sesgo de canal.' },
  { value: 'WIDE_PLAY', label: 'Bandas', hint: 'Busca más ataques y remates por los costados.' },
  { value: 'LEFT_FLANK', label: 'Canal izquierdo', hint: 'Carga ataques por el canal izquierdo del modelo.' },
  { value: 'RIGHT_FLANK', label: 'Canal derecho', hint: 'Carga ataques por el canal derecho del modelo.' },
  { value: 'CENTRAL_PLAY', label: 'Centro', hint: 'Concentra juego interior y remates centrales.' },
  { value: 'ATTACKING', label: 'Ofensivo', hint: 'Sube volumen general de chances.' },
  { value: 'DEFENSIVE', label: 'Defensivo', hint: 'Baja ritmo y prioriza protección.' },
  { value: 'COUNTER', label: 'Contra', hint: 'Menos posesión, más transición.' },
  { value: 'POSSESSION', label: 'Posesión', hint: 'Más posesión y elaboración.' },
];

export const SUBSTITUTION_WHAT_IF_MINUTE_OPTIONS = [45, 60, 70, 80] as const;

export const ROLE_SLOT_IMPACT_SLOT_OPTIONS = [
  { slotId: 'S04-1', label: 'LW alto · S04-1', kind: 'wideAtt' },
  { slotId: 'S06-3', label: 'RW alto · S06-3', kind: 'wideAtt' },
  { slotId: 'S05-2', label: 'ST centro · S05-2', kind: 'att' },
  { slotId: 'S17-2', label: 'CM centro · S17-2', kind: 'mid' },
  { slotId: 'S22-2', label: 'LB · S22-2', kind: 'def' },
  { slotId: 'S24-2', label: 'RB · S24-2', kind: 'def' },
  { slotId: 'S23-1', label: 'CB izq · S23-1', kind: 'def' },
  { slotId: 'S23-3', label: 'CB der · S23-3', kind: 'def' },
] as const;
