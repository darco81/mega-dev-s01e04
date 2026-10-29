import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

// Parse at the edge: anything that isn't a well-formed run line is null.
export function parseLine(text: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (!STATUSES.includes(o.status as RunStatus)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return { at: o.at, job: o.job, status: o.status as RunStatus, owner: o.owner, ...(o.error !== undefined && { error: o.error }) };
}

export function digest(night: string, text: string): Night {
  let badLines = 0;
  const byJob = new Map<string, RunLine[]>();
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    byJob.set(line.job, [...(byJob.get(line.job) ?? []), line]);
  }

  const rows: DigestRow[] = [...byJob].map(([job, lines]) => {
    // Order by the instant, display the string as logged (offset kept).
    const sorted = [...lines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const last = sorted[sorted.length - 1]!;
    const lastError = [...sorted].reverse().find((l) => l.error !== undefined)?.error ?? null;
    return {
      job,
      owner: last.owner,
      runs: sorted.length,
      retries: sorted.filter((l) => l.status === 'retry').length,
      lastStatus: last.status,
      lastError,
      first: sorted[0]!.at,
      last: last.at,
    };
  });
  rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  return digest(night, text);
};
