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
 * What the answer may and may not be used for, because the archive is locked by
 * the running desktop app:
 * - Writing needs `r+`, which Windows refuses while the app (or even an earlier
 *   Host that is still shutting down) holds the file: that path only opens when
 *   nothing is running it, and answers `io` otherwise.
 * - Reading the two literals is allowed even while the app is running. Only a
 *   path that reads is returned here, and only a path taken from this process's
 *   own launch arguments: never a guessed install under LOCALAPPDATA, because a
 *   browser-only GUI patching another copy would be a write the user did not
 *   mean. `DSHCT_DESKTOP_ASAR` exists for tests.
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
      const candidate = arg.slice(0, inside + 'app.asar'.length + 1);
      if (isReadable(candidate)) return candidate;
      continue;
    }
    if (lower.length > 'app.asar'.length && lower.endsWith(`${SEP}app.asar`)) {
      if (isReadable(arg)) return arg;
    }
  }
  return null;
}

/**
 * Can this archive be read right now? The running desktop app keeps it open
 * with a share mode that allows reads; `openSync` decides, not `statSync`.
 * The descriptor is only probed, never read, so nothing is grabbed from it.
 * @param {string} path
 */
function isReadable(path) {
  let fd = null;
  try {
    fd = openSync(path, 'r');
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
    if (found.mainValue === target && found.preloadValue === target) {
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

    writeFully(fd, Buffer.from(target), mainAt);
    writeFully(fd, Buffer.from(`${target}px`), preloadAt);
    fsyncSync(fd);
    return { ok: true, already: false, previous: found.mainValue, height: target, backupPath };
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
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
  // A read-only descriptor still cannot tell whether the write will be allowed:
  // the desktop app shares the archive for reading, not for writing.
  const writable = openForWrite(asarPath) === null;
  if (found === null) {
    sendJson(response, 200, { ok: false, code: 'no-marker', path: asarPath, writable });
    return;
  }
  sendJson(response, 200, { ok: true, height: found.height, preload: found.preload, path: asarPath, writable });
}

/**
 * Why `openSync(asarPath, 'r+')` would fail, if it would.
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
