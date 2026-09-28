import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Windows callers can select Git Bash; CI runs the real POSIX sh.
const shell = process.env.DEPLOY_TEST_SHELL || 'sh';
const script = fileURLToPath(new URL('./check-assets.sh', import.meta.url));
function shellPath(value) {
  if (process.platform !== 'win32') return value;
  const result = spawnSync(shell, ['-c', 'cygpath -u "$1"', 'probe', value], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return result.stdout.trim();
}

async function runProbe(t, headers, { noticeFails = false, curlExit = 0 } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), '3dpage-http-probe-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.match(path.basename(root), /^3dpage-http-probe-[a-zA-Z0-9]+$/);
    await rm(root, { recursive: true, force: true });
  });
  const log = path.join(root, 'requests.log');
  await writeFile(path.join(root, 'curl'), `#!/bin/sh
printf '%s\\n' "$*" >> "$PROBE_LOG"
case "$*" in
  *THIRD-PARTY-NOTICES.txt*)
    case " $* " in *' --fail '*) ;; *) exit 98 ;; esac
    [ "$NOTICE_FAILS" != 1 ] ;;
  *)
    case " $* " in *' --fail '*) exit 98 ;; esac
    case " $* " in *' --dump-header - '*) ;; *) exit 98 ;; esac
    printf '%s\\n' "$PROBE_HEADERS"
    exit "$CURL_EXIT" ;;
esac
`, { mode: 0o755 });
  const result = spawnSync(shell, ['-c',
    'PATH="$1:$PATH"; export PATH; [ "$(command -v curl)" = "$1/curl" ] || exit 99; exec sh "$2"',
    'probe', shellPath(root), shellPath(script)], {
    encoding: 'utf8', timeout: 10000,
    env: { ...process.env, PROBE_HEADERS: headers, PROBE_LOG: shellPath(log),
      NOTICE_FAILS: noticeFails ? '1' : '0', CURL_EXIT: String(curlExit) },
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.notEqual(result.status, 99, 'The probe must use the fixture curl, never the network');
  return { ...result, requests: (await readFile(log, 'utf8')).trim().split('\n') };
}

const response = (status = '404 Not Found', cache = 'Cache-Control: no-store', protocol = 'HTTP/1.1') =>
  `${protocol} ${status}\r\nServer: nginx/1.30.4\r\n${cache}\r\nContent-Length: 153\r\n\r\n`;

test('curl reads full 404 headers without --fail and checks every URL', async (t) => {
  const result = await runProbe(t, response());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.requests.length, 7, 'All seven retired URLs must be checked');
  assert.match(result.stdout, /Retired media routes return 404\/no-store/);
});

test('the real BusyBox 404 output lacks headers and cannot prove no-store', async (t) => {
  const result = await runProbe(t, 'Connecting to 127.0.0.1 (127.0.0.1:80)\n  HTTP/1.1 404 Not Found\n'
    + 'wget: server returned error: HTTP/1.1 404 Not Found\n');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 404; Cache-Control no-store: no/);
});

test('HTTP/2 status and case-insensitive cache headers are accepted', async (t) => {
  const result = await runProbe(t, response('404 Not Found', 'cAcHe-CoNtRoL:\tprivate, NO-STORE', 'HTTP/2'));
  assert.equal(result.status, 0, result.stderr);
});

test('only the last real response status counts', async (t) => {
  const result = await runProbe(t, response('100 Continue', '') + response());
  assert.equal(result.status, 0, result.stderr);
});

test('an accessible retired asset still fails, even if a diagnostic mentions 404', async (t) => {
  const result = await runProbe(t, response('200 OK') + 'diagnostic: HTTP/1.1 404 Not Found');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 200/);
  assert.equal(result.requests.length, 1);
});

test('an error message alone does not prove an HTTP response', async (t) => {
  const result = await runProbe(t, 'Cache-Control: no-store\ndiagnostic: HTTP/1.1 404 Not Found');
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /HTTP 404/);
});

test('404 responses without no-store still fail', async (t) => {
  const result = await runProbe(t, response('404 Not Found', 'Cache-Control: public'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 404/);
});

test('no-store must belong to the final response', async (t) => {
  const result = await runProbe(t, response('100 Continue') + response('404 Not Found', 'Cache-Control: public'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 404; Cache-Control no-store: no/);
});

test('other headers and longer directive names cannot impersonate no-store', async (t) => {
  for (const cache of ['X-Cache-Control: no-store', 'Cache-Control: no-store-invalid', 'Cache-Control: public, x-no-store']) {
    const result = await runProbe(t, response('404 Not Found', cache));
    assert.equal(result.status, 1, cache);
  }
});

test('repeated Cache-Control headers may contain the no-store directive', async (t) => {
  const result = await runProbe(t, response('404 Not Found', 'Cache-Control: private\r\nCache-Control: no-store'));
  assert.equal(result.status, 0, result.stderr);
});

test('connection failures and timeouts cannot pass even with partial valid headers', async (t) => {
  for (const [headers, curlExit] of [['', 7], [response(), 28]]) {
    const result = await runProbe(t, headers, { curlExit });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unable to check retired asset/);
    assert.equal(result.requests.length, 1);
  }
});

test('server errors cannot pass the retirement check', async (t) => {
  const result = await runProbe(t, response('500 Internal Server Error'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 500/);
});

test('a missing legal notice does not block deployment', async (t) => {
  const result = await runProbe(t, response(), { noticeFails: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.requests.length, 7);
  assert.ok(result.requests.every(request => !request.includes('THIRD-PARTY-NOTICES.txt')));
  assert.match(result.stdout, /Retired media routes return 404\/no-store/);
});
