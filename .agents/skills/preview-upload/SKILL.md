---
name: preview-upload
description: Save a rig page as one HTML file and put it on a public HTTPS link (Cloudflare, wrangler), then upload over the same link without the lane marker. Use for a plan's "Preview for review" and "Clean up" steps (ADR 0003).
---

# preview-upload

## Steps

1. Ask the human before each upload: what goes public, where, who sees it, how to undo it.
2. Save the page with a command, outside the repo (previews are never committed):

   ```sh
   pnpm start &                       # LANE_MARKER from .env; empty it for the clean-up upload
   mkdir -p ../preview/site
   curl -sf localhost:8787/digest/<night> -o ../preview/site/index.html
   ```

3. Deploy only that folder. `../preview/wrangler.jsonc`:

   ```jsonc
   { "name": "rig-digest-preview", "compatibility_date": "2026-10-23", "assets": { "directory": "./site" } }
   ```

   `cd ../preview && npx wrangler@4 deploy` → `https://<name>.<account>.workers.dev`.
4. Check from outside before sending: `curl -s <link> | grep -o 'class="marker">[^<]*'` shows the marker
   you expect, and `curl -so /dev/null -w '%{http_code}' <link>/wrangler.jsonc` is 404.
5. Send the link. Keep the issue open until the reviewer has looked.
6. Clean up: empty `LANE_MARKER`, restart, save again, deploy again (same name = same link), check
   the banner reads "no marker set". Undo for good: `npx wrangler@4 delete <name>`.

## Don'ts

- Don't run `wrangler pages project create` / `pages deploy` here: wrangler 4.15x delegates them
  to Workers, writes `wrangler.jsonc` with `assets.directory: "."` and publishes the whole folder,
  `.wrangler/cache` included (seen 2026-10-29).
- Don't point `assets.directory` at a folder holding anything but the page.
