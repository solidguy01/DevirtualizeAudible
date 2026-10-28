// Playwright fixture: a browser context with the built extension loaded and audible.com served from tests/pages
const { test: base, expect, chromium, firefox } = require('@playwright/test');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
const PAGES = path.join(__dirname, 'pages');

function freePort() {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Minimal Firefox Remote Debugging Protocol client (frames are "<byte length>:<json>"),
// the same calls web-ext uses to install a temporary add-on
function installTemporaryAddon(port, addonPath) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    let buffer = Buffer.alloc(0);
    const send = (message) => {
      const json = JSON.stringify(message);
      socket.write(`${Buffer.byteLength(json)}:${json}`);
    };
    const handle = (message) => {
      if (message.error) {
        socket.end();
        reject(new Error(`${message.error}: ${message.message}`));
      } else if (message.applicationType) {
        send({ to: 'root', type: 'getRoot' });
      } else if (message.addonsActor) {
        send({ to: message.addonsActor, type: 'installTemporaryAddon', addonPath });
      } else if (message.addon) {
        socket.end();
        resolve(message.addon);
      }
    };
    socket.on('error', reject);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const sep = buffer.indexOf(':');
        const length = Number(buffer.subarray(0, sep).toString());
        if (sep < 0 || buffer.length < sep + 1 + length) {
          return;
        }
        handle(JSON.parse(buffer.subarray(sep + 1, sep + 1 + length).toString()));
        buffer = buffer.subarray(sep + 1 + length);
      }
    });
  });
}

async function launchChromium() {
  const extension = path.join(DIST, 'chrome');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  return { context, close: () => context.close() };
}

async function launchFirefox() {
  const port = await freePort();
  const browser = await firefox.launch({
    args: ['-start-debugger-server', String(port)],
    firefoxUserPrefs: {
      'devtools.debugger.remote-enabled': true,
      'devtools.debugger.prompt-connection': false,
    },
  });
  await installTemporaryAddon(port, path.join(DIST, 'firefox'));
  const context = await browser.newContext();
  return { context, close: () => browser.close() };
}

exports.expect = expect;
exports.test = base.extend({
  context: async ({}, use, testInfo) => {
    const { context, close } = testInfo.project.name === 'firefox' ? await launchFirefox() : await launchChromium();
    // Every www.audible.* request gets tests/pages/<path>.html, so the content script's
    // host matches fire without live traffic
    await context.route(/^https:\/\/www\.audible\.[a-z.]+\//, (route) => {
      const file = path.join(PAGES, `${new URL(route.request().url()).pathname.slice(1)}.html`);
      route.fulfill(fs.existsSync(file) ? { contentType: 'text/html', path: file } : { status: 404 });
    });
    await use(context);
    await close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});
