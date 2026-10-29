import { describe, expect, it } from 'vitest';
import { digest, readNight } from '../src/digest/read.js';

describe('readNight', () => {
  const n = readNight('runs', '2026-10-28')!;

  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']);
  });

  it('counts runs and retries and keeps the latest error', () => {
    const f = n.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(f).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503', first: '2026-10-29T01:30:00+01:00', last: '2026-10-29T01:37:00+01:00' });
    expect(n.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    expect(n.rows.find((r) => r.job === 'digest/render')).toMatchObject({ owner: null, runs: 1 });
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../etc/passwd')).toBeNull();
  });

  it('never throws on bad input and renders an empty night', () => {
    expect(digest('x', '')).toEqual({ night: 'x', rows: [], badLines: 0 });
    expect(digest('x', '{"at":"nope","job":"a","status":"ok","owner":null}\n[]\n{').badLines).toBe(3);
  });

  it('orders by instant across offsets but keeps the logged string', () => {
    const r = digest('x', ['{"at":"2026-10-25T02:30:00+01:00","job":"a","status":"ok","owner":"x"}', '{"at":"2026-10-25T02:10:00+02:00","job":"a","status":"retry","owner":"x"}'].join('\n')).rows[0]!;
    expect(r.first).toBe('2026-10-25T02:10:00+02:00');
    expect(r.lastStatus).toBe('ok');
  });
});
