// Optional Linux CI fallback when Playwright's browser CDN is unavailable.
// Uses the pinned npm-distributed Chromium binary; no downloads outside npm.
import {
  createReadStream,
  createWriteStream,
  chmodSync,
  mkdirSync,
} from "node:fs";
import { createBrotliDecompress } from "node:zlib";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";
const directory = path.join(os.tmpdir(), "proofwrite-browser");
mkdirSync(directory, { recursive: true });
const target = path.join(directory, "chromium");
await pipeline(
  createReadStream(
    new URL(
      "../node_modules/@sparticuz/chromium/bin/chromium.br",
      import.meta.url,
    ),
  ),
  createBrotliDecompress(),
  createWriteStream(target),
);
chmodSync(target, 0o700);
process.stdout.write(`${target}\n`);
