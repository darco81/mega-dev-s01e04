import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import type { Night } from '../src/digest/types.js';

const NIGHT = '2026-11-02';
const EMPTY = '2026-11-03';
const BAD = '2026-11-04';
const MISSING = '2026-01-01';

const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error !== undefined && { error }) });

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup'];

let runsDir: string;
let config: RigConfig;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-'));
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
  writeFileSync(
    join(runsDir, `${NIGHT}.jsonl`),
    [
      line('2026-11-02T01:30:00+01:00', 'notes/backup', 'fail', 'ops', 'quota exceeded'),
      line('2026-11-02T01:10:00+01:00', 'lane/sync', 'ok', null),
      line('2026-11-02T01:20:00+01:00', 'fixtures/refresh', 'retry', 'qa', 'upstream 503'),
      line('2026-11-02T01:25:00+01:00', 'fixtures/refresh', 'retry', 'qa', 'upstream 503'),
      line('2026-11-02T01:40:00+01:00', 'fixtures/refresh', 'ok', 'qa'),
      line('2026-11-02T02:00:00+01:00', 'digest/render', 'ok', null),
      '',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD}.jsonl`),
    [line('2026-11-04T01:00:00+01:00', 'lane/sync', 'ok', 'ops'), '{not json', ''].join('\n'),
  );
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('returns 200 for a night with a file', async () => {
    const res = await createApp(config).request(`/digest/${NIGHT}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for the empty night', async () => {
    const res = await createApp(config).request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders 200 for a night with a bad line', async () => {
    const res = await createApp(config).request(`/digest/${BAD}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('lane/sync');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 with the Night object for a night with a file', async () => {
    const res = await createApp(config).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe(NIGHT);
    expect(body.rows.map((r) => r.job)).toEqual(JOBS);
  });

  it('returns 404 with an error body for a night with no file', async () => {
    const res = await createApp(config).request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns an empty rows array for the empty night', async () => {
    const res = await createApp(config).request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts the bad line and still returns the night', async () => {
    const res = await createApp(config).request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const app = createApp(config);
    const html = await (await app.request(`/digest/${NIGHT}`)).text();
    const json = (await (await app.request(`/api/digest/${NIGHT}`)).json()) as Night;
    const positions = json.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(json.rows.map((r) => r.job)).toEqual(JOBS);
  });
});
