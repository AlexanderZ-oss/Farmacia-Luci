/**
 * Farmacia Luci – Design tokens
 * Single source of truth for all brand colors.
 * Import from here, never from _layout files.
 *
 * Estilo: corporativo clínico — verde institucional (petróleo) sobrio,
 * acento azul corporativo, neutros fríos y superficies oscuras para
 * barra superior y pie de página.
 */
import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export const C = {
  // Brand – verde institucional (petróleo) sobrio
  green:      '#0E6E64',
  greenDark:  '#0A4F48',
  greenMid:   '#12857A',
  greenLight: '#E3F1EF',

  // Acento secundario – azul corporativo (badges, indicadores)
  accent:      '#1E3A5F',
  accentLight: '#EDF2F8',

  // Neutros
  white:        '#FFFFFF',
  bgPage:       '#F6F9F9',
  bgSubtle:     '#EEF4F4',
  border:       '#E9EEF0',
  borderStrong: '#CBD6DC',

  // Superficies oscuras institucionales (barra superior, pie de página)
  ink:    '#0E2B29',
  inkMid: '#1A4441',

  // Text
  text:      '#0D1B2A',
  textMid:   '#475569',
  textLight: '#94A3B8',

  // On dark surfaces
  onDark:     '#FFFFFF',
  onDarkMid:  'rgba(255,255,255,0.72)',
  onDarkLine: 'rgba(255,255,255,0.16)',

  // Semantic
  red:   '#DC2626',
  amber: '#D97706',
} as const;
