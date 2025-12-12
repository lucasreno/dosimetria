import { z } from 'zod';

export const PENAL_YEAR = 360;
export const PENAL_MONTH = 30;

export interface Duration {
  years: number;
  months: number;
  days: number;
}

export const durationSchema = z.object({
  years: z.coerce.number().min(0).default(0),
  months: z.coerce.number().min(0).default(0),
  days: z.coerce.number().min(0).default(0),
});

export type PenalMode = 'soma' | 'subtracao';

export const fractionOptions = [
  { label: '1/1 (Integral)', value: 1 },
  { label: '1/2', value: 0.5 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/4', value: 0.25 },
  { label: '1/5', value: 0.2 },
  { label: '1/6', value: 1 / 6 },
  { label: '2/3', value: 2 / 3 },
  { label: '3/5', value: 0.6 },
  { label: '16% (Crime Hediondo primário)', value: 0.16 },
  { label: '25% (Não hediondo)', value: 0.25 },
  { label: '30% (Reincidente não hediondo)', value: 0.30 },
  { label: '40% (Hediondo primário)', value: 0.40 },
  { label: '50% (Hediondo c/ resultado morte)', value: 0.50 },
  { label: '60% (Reincidente hediondo)', value: 0.60 },
  { label: '70% (Reincidente hediondo c/ morte)', value: 0.70 },
];

export function toDays(d: Duration): number {
  return (d.years * PENAL_YEAR) + (d.months * PENAL_MONTH) + d.days;
}

export function fromDays(totalDays: number): Duration {
  let remainder = Math.floor(Math.max(0, totalDays));

  const years = Math.floor(remainder / PENAL_YEAR);
  remainder %= PENAL_YEAR;

  const months = Math.floor(remainder / PENAL_MONTH);
  const days = remainder % PENAL_MONTH;

  return { years, months, days };
}

export function calculateExecution(base: Duration, fraction: number): Duration {
  const totalDays = toDays(base);
  const resultDays = Math.floor(totalDays * fraction);
  return fromDays(resultDays);
}

export function formatDuration(d: Duration): string {
  const parts = [];
  if (d.years > 0) parts.push(`${d.years} ano${d.years !== 1 ? 's' : ''}`);
  if (d.months > 0) parts.push(`${d.months} m${d.months !== 1 ? 'eses' : 'ês'}`);
  if (d.days > 0 || parts.length === 0) parts.push(`${d.days} dia${d.days !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

export function generateMemoryString(
  base: Duration,
  fractionLabel: string,
  result: Duration,
  mode: PenalMode
): string {
  const baseStr = formatDuration(base);
  const resultStr = formatDuration(result);
  const operationStr = mode === 'soma' ? 'Soma/Progressão' : 'Remição/Detração';

  return `MEMÓRIA DE CÁLCULO - ${operationStr.toUpperCase()}
----------------------------------------
Pena Base: ${baseStr}
Fração Aplicada: ${fractionLabel}
----------------------------------------
Resultado: ${resultStr}
`;
}
