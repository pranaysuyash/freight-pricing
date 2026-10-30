/**
 * Inbound cross-product bridge parameter parser.
 *
 * Other products hand off a load via URL query parameters. This module is the
 * single place that validates them, so a received value is either applied or
 * explicitly reported as rejected — never silently ignored.
 */
import type { EquipmentCategory } from './types';

export interface InboundBridge {
  source: string | null;
  equipmentCategory?: EquipmentCategory;
  loadedMiles?: number;
  deadheadMiles?: number;
  cargoWeightLbs?: number;
  extraStops?: number;
  hazmat?: boolean;
  reefer?: boolean;
  actualMpg?: number;
  /** Parameters present in the URL but rejected, with reasons. */
  rejected: string[];
}

const EQUIPMENT: readonly EquipmentCategory[] = ['dry_van', 'reefer', 'flatbed', 'step_deck'];
const LBS_PER_KG = 2.20462;

function positive(raw: string | null, name: string, rejected: string[], allowZero = false): number | undefined {
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) {
    rejected.push(`${name}="${raw}" is not a valid ${allowZero ? 'non-negative' : 'positive'} number`);
    return undefined;
  }
  return n;
}

export function parseInboundBridge(params: URLSearchParams): InboundBridge {
  const rejected: string[] = [];
  const out: InboundBridge = { source: params.get('source'), rejected };

  const eq = params.get('equipment');
  if (eq !== null) {
    if ((EQUIPMENT as readonly string[]).includes(eq)) out.equipmentCategory = eq as EquipmentCategory;
    else rejected.push(`equipment="${eq}" is not a supported category`);
  }

  out.loadedMiles = positive(params.get('loadedMiles') ?? params.get('miles'), 'loadedMiles', rejected);
  out.deadheadMiles = positive(params.get('deadheadMiles'), 'deadheadMiles', rejected, true);
  out.actualMpg = positive(params.get('actualMpg') ?? params.get('mpg'), 'actualMpg', rejected);

  // Weight: accept lbs directly, else convert kg. Explicit lbs wins.
  const lbs = positive(params.get('cargoWeight') ?? params.get('loadedLbs'), 'cargoWeight', rejected);
  const kg = positive(params.get('loadedKg'), 'loadedKg', rejected);
  out.cargoWeightLbs = lbs ?? (kg !== undefined ? Math.round(kg * LBS_PER_KG) : undefined);

  const stops = positive(params.get('extraStops'), 'extraStops', rejected, true);
  out.extraStops = stops !== undefined ? Math.floor(stops) : undefined;

  if (params.has('hazmat')) out.hazmat = params.get('hazmat') === '1';
  if (params.has('reefer')) out.reefer = params.get('reefer') === '1';
  return out;
}
