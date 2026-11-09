/**
 * Host half of the chat-typography bundle.
 *
 * The settings page's "desktop title bar" button needs to write two literals
 * inside the official desktop app's `app.asar` — the Electron
 * `titleBarOverlay.height` of the primary window and the
 * `--dsh-windows-titlebar-height` value the preload mirrors to the page. A
 * browser page cannot touch those files, so this host half registers one small
 * same-origin route and does the byte patch in the DSH host process.
 *
 * The replacements keep the byte length identical (two digits), so the asar
 * header and every file offset stay valid and the archive is patched in place.
 * A full backup is written once before the first patch.
 */
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readSync,
  writeSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { tmpdir } from 'node:os';

const ROUTE_PATH = '/chat-typography/api/windows-titlebar';
const ACTION_HEADER = 'x-dshct-action';
const MIN_HEIGHT = 20;
const MAX_HEIGHT = 40;
/** argv holds the separator the running platform uses; match that one only. */
const SEP = sep;

/**
 * Locate the running desktop app's archive.
 *
 * Electron's desktop shell spawns this Host as
 *
 *   `…\DeepSeek Harness.exe --expose-internals
 *    …\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\index.js
 *    …\resources\app.asar\dsh  <profile>`
 *
 * so the runtime directory (`argv[2]`) is an archive-internal path whose parent
 * directory is the real `app.asar`, and `argv[3]` is the profile directory.
 * Older launchers pass a plain `…\resources\app.asar` argument instead.
 *
 * What the answer may and may not be used for:
 * - This Host runs under Electron's patched `fs`, where the archive itself is a
 *   virtual directory: `openSync(archive, 'r')` is ENOENT and a write is never
 *   possible. Entries inside it open and stat normally, so the probe below reads
 *   a real entry (`lib/main.js`) instead of opening the container.
 * - Only a path that this probe resolves is returned, and only one taken from
 *   this process's own launch arguments: never a guessed install under
 *   LOCALAPPDATA, because a browser-only GUI patching another copy would be a
 *   write the user did not mean. `DSHCT_DESKTOP_ASAR` exists for tests.
 * @returns {string | null}
 */
function resolveAsarPath() {
  const override = process.env.DSHCT_DESKTOP_ASAR;
  if (typeof override === 'string' && override.endsWith('app.asar') && isReadable(override)) return override;
  for (const arg of process.argv) {
    if (typeof arg !== 'string') continue;
    const lower = arg.toLowerCase();
    const inside = lower.indexOf(`${SEP}app.asar${SEP}`);
    if (inside > 0) {
      const candidate = arg.slice(0, inside + 'app.asar'.length);
      if (isReadable(candidate)) return candidate;
      continue;
    }
    const tail = `${SEP}app.asar`;
    if (lower.endsWith(tail)) {
      const candidate = arg.slice(0, arg.length - tail.length + 1 + 'app.asar'.length);
      if (isReadable(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Can this archive be read right now? Two runtimes have to agree here:
 * - A plain Node process opens the archive as the file it is.
 * - Electron's asar-aware `fs` makes it a virtual directory: opening the
 *   container is ENOENT (`not found in …app.asar`) and only entries inside it
 *   open, so the probe falls back to one known entry.
 * Probing the container first keeps tests and the CLI script working, and the
 * fallback is what a real desktop install needs.
 * @param {string} asarPath
 */
function isReadable(asarPath) {
  if (canOpen(asarPath)) return true;
  return canOpen(join(asarPath, 'lib', 'main.js'));
}

/**
 * @param {string} target
 */
function canOpen(target) {
  let fd = null;
  try {
    fd = openSync(target, 'r');
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Fill `buffer` from one file position. A single readSync is allowed to return
 * fewer bytes than asked for (and does on Windows), which would truncate the
 * tail of a large entry and hide the literals near the end of `main.js`.
 * @param {number} fd
 * @param {Buffer} buffer
 * @param {number} position
 */
function readFully(fd, buffer, position) {
  let filled = 0;
  while (filled < buffer.length) {
    const read = readSync(fd, buffer, filled, buffer.length - filled, position + filled);
    if (read <= 0) break;
    filled += read;
  }
  return filled;
}

/**
 * Write `buffer` at one file position, in case a single writeSync is partial.
 * @param {number} fd
 * @param {Buffer} buffer
 * @param {number} position
 */
function writeFully(fd, buffer, position) {
  let written = 0;
  while (written < buffer.length) {
    const count = writeSync(fd, buffer, written, buffer.length - written, position + written);
    if (count <= 0) throw new Error('short write');
    written += count;
  }
}

/**
 * Read the asar header and its data start.
 * @param {number} fd
 */
function readHeader(fd) {
  const head = Buffer.alloc(16);
  readFully(fd, head, 0);
  const headerBytes = head.readUInt32LE(4);
  const jsonBytes = head.readUInt32LE(12);
  const json = Buffer.alloc(jsonBytes);
  readFully(fd, json, 16);
  return {
    header: JSON.parse(json.toString('utf8').replace(/\0+$/g, '').trimEnd()),
    dataStart: 8 + headerBytes,
  };
}

/**
 * @param {any} header parsed asar directory
 * @param {string} rel slash-separated path
 */
function entryOf(header, rel) {
  let cur = header;
  for (const seg of rel.split('/')) cur = cur?.files?.[seg];
  // asar stores size/offset as numbers or decimal strings depending on writer.
  if (!cur || cur.size === undefined || cur.offset === undefined) return null;
  return { size: Number(cur.size), offset: Number(cur.offset) };
}

/**
 * @param {number} fd
 * @param {number} dataStart
 * @param {{ size: number, offset: number }} entry
 */
function readEntry(fd, dataStart, entry) {
  const buf = Buffer.alloc(entry.size);
  readFully(fd, buf, dataStart + Number(entry.offset));
  return buf;
}

/**
 * Find the primary window's overlay height and the preload mirror inside the
 * packaged sources. Pure byte scans: latin1 keeps one char per byte, so every
 * index is a file-relative byte offset.
 * @param {Buffer} mainBuf
 * @param {Buffer} preloadBuf
 */
function findHeights(mainBuf, preloadBuf) {
  const overlayNeedle = Buffer.from('titleBarOverlay: {');
  let at = 0;
  /** @type {{ value: string, digitAt: number }[]} */
  const primary = [];
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
  if (primary.length !== 1) return null;

  const propNeedle = Buffer.from('setProperty("--dsh-windows-titlebar-height", `');
  const propAt = preloadBuf.indexOf(propNeedle);
  if (propAt < 0) return null;
  const after = preloadBuf.subarray(propAt + propNeedle.length, propAt + propNeedle.length + 16).toString('latin1');
  const preloadMatch = /^(\d+)px`\)/.exec(after);
  if (preloadMatch === null) return null;

  return {
    mainValue: primary[0].value,
    mainDigitAt: primary[0].digitAt,
    preloadValue: preloadMatch[1],
    preloadDigitAt: propAt + propNeedle.length,
  };
}

/**
 * Patch both literals to `target`.
 *
 * Electron's patched `fs` routes every write on a path that traverses the
 * archive virtual folder into `app.asar.unpacked/<same relative path>`, creating
 * it on demand (`copyFileUnpackedIfNeedBe`). That is how a packaged app writes
 * to itself, and both files have to be unpacked — the desktop main process reads
 * `lib/main.js` back out of `app.asar` when it compiles the archive, the way it
 * does for `lib/preload-app.cjs`. A plain Node process (the CLI script) writes
 * the archive bytes in place instead.
 * @param {string} asarPath
 * @param {string} target two ASCII digits
 */
function patchHeight(asarPath, target) {
  const fd = openSync(asarPath, 'r+');
  try {
    const { header, dataStart } = readHeader(fd);
    const main = entryOf(header, 'lib/main.js');
    const preload = entryOf(header, 'lib/preload-app.cjs');
    if (main === null || preload === null) return { ok: false, code: 'no-marker' };

    const found = findHeights(readEntry(fd, dataStart, main), readEntry(fd, dataStart, preload));
    if (found === null) return { ok: false, code: 'no-marker' };
    const mainPath = join(asarPath, 'lib', 'main.js');
    const preloadPath = join(asarPath, 'lib', 'preload-app.cjs');
    const unpacked = isUnpacked(mainPath) || isUnpacked(preloadPath);
    if (found.mainValue === target && found.preloadValue === target) {
      // An unpacked copy outranks the archive, so "already" still has to make
      // sure both copies say the target instead of trusting the archive alone.
      if (!unpacked) return { ok: true, already: true, previous: target, height: target };
      writeFully(fd, Buffer.from(target), dataStart + Number(main.offset) + found.mainDigitAt);
      writeFully(fd, Buffer.from(`${target}px`), dataStart + Number(preload.offset) + found.preloadDigitAt);
      fsyncSync(fd);
      writeEntry(mainPath, target);
      writeEntry(preloadPath, `${target}px`);
      return { ok: true, already: true, previous: target, height: target };
    }
    if (found.mainValue.length !== target.length || found.preloadValue.length !== target.length) {
      return { ok: false, code: 'digit-count' };
    }

    const mainAt = dataStart + Number(main.offset) + found.mainDigitAt;
    const preloadAt = dataStart + Number(preload.offset) + found.preloadDigitAt;
    const check = Buffer.alloc(4);
    readFully(fd, check, mainAt);
    if (check.subarray(0, 2).toString() !== found.mainValue) return { ok: false, code: 'offset-drift' };
    readFully(fd, check, preloadAt);
    if (check.toString() !== `${found.preloadValue}px`) return { ok: false, code: 'offset-drift' };

    const backupPath = join(tmpdir(), 'dsh-app-asar-backup', 'app.asar.orig');
    if (!existsSync(backupPath)) {
      mkdirSync(dirname(backupPath), { recursive: true });
      copyFileSync(asarPath, backupPath);
    }

    // Archive first: under Electron the writes land in the unpacked copies, and
    // `fsyncSync` on this descriptor is what commits them.
    writeFully(fd, Buffer.from(target), mainAt);
    writeFully(fd, Buffer.from(`${target}px`), preloadAt);
    fsyncSync(fd);
    writeEntry(mainPath, target);
    writeEntry(preloadPath, `${target}px`);
    return { ok: true, already: false, previous: found.mainValue, height: target, backupPath };
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Rewrite one literal through its archive entry path.
 *
 * Under Electron `openSync(…, 'r+')` on an archive-internal path succeeds and
 * the writes go to `app.asar.unpacked`, which is the only writable half. In a
 * plain Node process the same open would hand back the archive's own bytes (and
 * a read-only container), so it is skipped: the archive was patched directly.
 * @param {string} entryPath
 * @param {string} literal the exact bytes to write at offset 0
 */
function writeEntry(entryPath, literal) {
  let fd = null;
  try {
    fd = openSync(entryPath, 'r+');
  } catch {
    return;
  }
  try {
    writeFully(fd, Buffer.from(literal), 0);
    fsyncSync(fd);
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Does an unpacked copy of this archive entry already exist? When it does,
 * Electron ignores the archive bytes and reads the copy, so both have to change.
 * @param {string} entryPath an archive-internal path
 */
function isUnpacked(entryPath) {
  try {
    return existsSync(entryPath.replace(`${SEP}app.asar${SEP}`, `${SEP}app.asar.unpacked${SEP}`));
  } catch {
    return false;
  }
}

/** @param {import('node:http').ServerResponse} response @param {number} status @param {unknown} payload */
function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

/**
 * @param {import('node:http').IncomingMessage} request
 */
async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error('body too large');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text === '' ? {} : JSON.parse(text);
}

/** @param {import('node:http').ServerResponse} response */
function reportState(response) {
  const asarPath = resolveAsarPath();
  if (asarPath === null) {
    sendJson(response, 200, { ok: false, code: 'not-desktop' });
    return;
  }
  /** @type {{ height: number, preload: number } | null} */
  let found = null;
  let fd = null;
  try {
    fd = openSync(asarPath, 'r');
    const { header, dataStart } = readHeader(fd);
    const main = entryOf(header, 'lib/main.js');
    const preload = entryOf(header, 'lib/preload-app.cjs');
    if (main !== null && preload !== null) {
      const heights = findHeights(readEntry(fd, dataStart, main), readEntry(fd, dataStart, preload));
      if (heights !== null) found = { height: Number(heights.mainValue), preload: Number(heights.preloadValue) };
    }
  } catch {
    sendJson(response, 200, { ok: false, code: 'unreadable', path: asarPath });
    return;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
  // Opening the container for writing is never allowed inside Electron, so the
  // answer is not a property of the archive: the write goes through
  // app.asar.unpacked and is offered whenever the archive itself is readable.
  const writable = true;
  if (found === null) {
    sendJson(response, 200, { ok: false, code: 'no-marker', path: asarPath, writable });
    return;
  }
  sendJson(response, 200, { ok: true, height: found.height, preload: found.preload, path: asarPath, writable });
}

/**
 * Why `openSync(asarPath, 'r+')` would fail, if it would.
 *
 * Under Electron's asar-aware `fs` the container can never be opened, so this
 * only tells the truth in a plain Node process (tests, the CLI script). The
 * Host ignores it and reports `writable: false` instead, because the write it
 * performs is redirected to `app.asar.unpacked` — see `patchHeight`.
 * @param {string} asarPath
 * @returns {string | null} an errno code, or null when the archive is writable
 */
function openForWrite(asarPath) {
  let fd = null;
  try {
    fd = openSync(asarPath, 'r+');
    return null;
  } catch (error) {
    return error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 */
async function handle(request, response) {
  const url = new URL(request.url ?? ROUTE_PATH, 'http://127.0.0.1');
  if (url.pathname !== ROUTE_PATH) {
    sendJson(response, 404, { ok: false, code: 'not-found' });
    return;
  }
  if (request.method === 'GET') {
    reportState(response);
    return;
  }
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'GET, POST' });
    response.end();
    return;
  }
  if (
    request.headers[ACTION_HEADER] !== 'titlebar' ||
    !String(request.headers['content-type'] ?? '').startsWith('application/json')
  ) {
    sendJson(response, 403, { ok: false, code: 'forbidden' });
    return;
  }
  /** @type {any} */
  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { ok: false, code: 'bad-body' });
    return;
  }
  const height = Number(body?.height);
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
    sendJson(response, 400, { ok: false, code: 'bad-height' });
    return;
  }
  const target = String(height);
  if (target.length !== 2) {
    sendJson(response, 400, { ok: false, code: 'digit-count' });
    return;
  }
  const asarPath = resolveAsarPath();
  if (asarPath === null) {
    sendJson(response, 200, { ok: false, code: 'not-desktop' });
    return;
  }
  try {
    const result = patchHeight(asarPath, target);
    sendJson(response, result.ok ? 200 : 409, result);
  } catch {
    sendJson(response, 500, { ok: false, code: 'io' });
  }
}

/**
 * Register the route for as long as this plugin is loaded.
 * @param {{ register: (route: any) => () => void }} webServer
 */
function mount(webServer) {
  return webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: (request, response) => handle(request, response),
  });
}

/**
 * Cordis entry.
 * @param {any} ctx
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => {
      const dispose = mount(webCtx.webServer);
      return () => dispose();
    });
  });
}
