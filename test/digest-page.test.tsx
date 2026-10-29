import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /digest/:night', () => {
  it('renders the rows of 2026-10-28', async () => {
    const res = await createApp().request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('fixtures/refresh');
  });
});
