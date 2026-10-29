import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('GET /api/digest/:night', () => {
  it('returns the same night readNight gives, 5 sorted rows', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(readNight('runs', '2026-10-28'));
    expect(body.rows).toHaveLength(5);
    const jobs = body.rows.map((r: { job: string }) => r.job);
    expect(jobs).toEqual([...jobs].sort());
  });
});
