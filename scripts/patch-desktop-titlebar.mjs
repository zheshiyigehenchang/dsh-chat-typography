/**
 * Lower the official DSH desktop title bar (default 28 CSS px).
 *
 * The Windows caption band is an Electron `titleBarOverlay` whose height is a
 * literal in the packaged `app.asar`:
 *
 *   - `lib/main.js`  -> titleBarOverlay.height for the primary window
 *   - `lib/preload-app.cjs` -> `--dsh-windows-titlebar-height` mirrored to the
 *     page as an inline style, which every layout offset keys off (e.g. "40px")
 *
 * Both values must change together or the DSH content reserves the wrong band
 * and slides under the native window controls. The replacements keep the byte
 * length identical (two digits: "40" -> "28", "40px" -> "28px"), so the asar
 * header and every file offset stay valid and the archive can be patched in
 * place.
 *
 * Usage (DSH reads the archive at launch, so quit and start it again to see a
 * new height; the write itself usually succeeds while it runs):
 *   node scripts/patch-desktop-titlebar.mjs [height] [path-to-app.asar]
 *
 * Updates replace app.asar, so re-run this after an update. A full backup of
 * the original archive is written before the first patch.
 */
import { copyFile, mkdir, open, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const requested = process.argv[2];
const TARGET = /^\d{2}$/.test(requested ?? '') ? requested : '28';
const asarPath =
  process.argv[3] ??
  join(homedir(), 'AppData', 'Local', 'Programs', 'DeepSeek Harness', 'resources', 'app.asar');
const backupPath = join(tmpdir(), 'dsh-app-asar-backup', 'app.asar.orig');

try {
  await patch();
} catch (error) {
  const code = error?.code;
  if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
    console.error(`cannot write ${asarPath} (${code}): quit the desktop app completely, then run this again.`);
  } else {
    console.error(String(error?.message ?? error));
  }
  process.exit(1);
}

async function patch() {
  const fd = await open(asarPath, 'r+');
  try {
    await run(fd);
  } finally {
    await fd.close().catch(() => {});
  }
}

/** @param {import('node:fs/promises').FileHandle} fd */
async function run(fd) {
  const head = Buffer.alloc(16);
  await fd.read(head, 0, 16, 0);
  const headerBytes = head.readUInt32LE(4);
  const jsonBytes = head.readUInt32LE(12);
  const json = Buffer.alloc(jsonBytes);
  await fd.read(json, 0, jsonBytes, 16);
  const header = JSON.parse(json.toString('utf8').replace(/\0+$/g, '').trimEnd());
  const dataStart = 8 + headerBytes;

  const entryOf = (rel) => {
    let cur = header;
    for (const seg of rel.split('/')) cur = cur.files?.[seg];
    if (!cur) throw new Error(`app.asar has no ${rel}`);
    return cur;
  };

  async function readRange(base, size) {
    const buf = Buffer.alloc(size);
    await fd.read(buf, 0, size, base);
    return buf;
  }

  const main = entryOf('lib/main.js');
  const preload = entryOf('lib/preload-app.cjs');
  const mainBuf = await readRange(dataStart + Number(main.offset), main.size);
  const preloadBuf = await readRange(dataStart + Number(preload.offset), preload.size);

  /* Byte-level scan: latin1 keeps one char per byte, so every index below is a
   * file-relative byte offset and can be added to the asar block base. */
  const overlayNeedle = Buffer.from('titleBarOverlay: {');
  const primary = [];
  let at = 0;
  for (;;) {
    const i = mainBuf.indexOf(overlayNeedle, at);
    if (i < 0) break;
    const window = mainBuf.subarray(i, i + 128).toString('latin1');
    const match = /^titleBarOverlay: \{\s*\n\s*height: (\d+),/.exec(window);
    if (match !== null) {
      const before = mainBuf.subarray(Math.max(0, i - 260), i).toString('latin1');
      if (before.includes('process.platform === "win32" && primary')) {
        const value = match[1];
        primary.push({ value, digitAt: i + window.indexOf(`height: ${value},`) + 'height: '.length });
      }
    }
    at = i + 1;
  }
  if (primary.length !== 1) throw new Error(`expected 1 primary titleBarOverlay, found ${primary.length}`);

  const propNeedle = Buffer.from('setProperty("--dsh-windows-titlebar-height", `');
  const propAt = preloadBuf.indexOf(propNeedle);
  if (propAt < 0) throw new Error('preload marker not found');
  const propAfter = preloadBuf.subarray(propAt + propNeedle.length, propAt + propNeedle.length + 16).toString('latin1');
  const preloadMatch = /^(\d+)px`\)/.exec(propAfter);
  if (preloadMatch === null) throw new Error('preload height literal not found');

  const mainValue = primary[0].value;
  const preloadValue = preloadMatch[1];
  if (mainValue === TARGET && preloadValue === TARGET) {
    console.log(`already ${TARGET}px; nothing to do`);
    return;
  }
  if (mainValue.length !== TARGET.length || preloadValue.length !== TARGET.length) {
    throw new Error(`cannot keep byte length: main=${mainValue} preload=${preloadValue} target=${TARGET}`);
  }

  const mainDigitAt = dataStart + Number(main.offset) + primary[0].digitAt;
  const preloadDigitAt = dataStart + Number(preload.offset) + propAt + propNeedle.length;

  const check = Buffer.alloc(4);
  await fd.read(check, 0, 2, mainDigitAt);
  if (check.subarray(0, 2).toString() !== mainValue) throw new Error('main offset drift');
  await fd.read(check, 0, 4, preloadDigitAt);
  if (check.toString() !== `${preloadValue}px`) throw new Error('preload offset drift');

  await mkdir(dirname(backupPath), { recursive: true });
  const backup = await stat(backupPath).catch(() => null);
  if (backup === null) {
    await copyFile(asarPath, backupPath);
    console.log(`backup: ${backupPath}`);
  } else {
    console.log(`backup already exists: ${backupPath} (${backup.size} B)`);
  }

  await fd.write(Buffer.from(TARGET), 0, TARGET.length, mainDigitAt);
  await fd.write(Buffer.from(`${TARGET}px`), 0, TARGET.length + 2, preloadDigitAt);
  await fd.sync();
  console.log(`patched main ${mainValue} -> ${TARGET} at ${mainDigitAt}`);
  console.log(`patched preload ${preloadValue}px -> ${TARGET}px at ${preloadDigitAt}`);
  console.log('restart DSH for the new caption height; app updates restore the original values.');
}