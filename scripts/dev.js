import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const findAvailablePort = (startPort) => new Promise((resolve) => {
  const server = net.createServer();
  server.unref();
  server.on('error', () => resolve(findAvailablePort(startPort + 1)));
  server.listen(startPort, '127.0.0.1', () => {
    server.close(() => resolve(startPort));
  });
});

const startProxy = (port) => {
  const proxy = spawn(process.execPath, ['server/spotifyProxy.js'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), VITE_SPOTIFY_PROXY_PORT: String(port) },
  });

  proxy.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`Spotify proxy exited with code ${code}`);
      process.exit(code || 1);
    }
  });
};

const startVite = (proxyPort, vitePort) => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(vitePort)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_SPOTIFY_PROXY_PORT: String(proxyPort) },
  });

  vite.on('exit', (code) => {
    process.exit(code || 0);
  });
};

const tryStart = async () => {
  const proxyPort = await findAvailablePort(Number(process.env.VITE_SPOTIFY_PROXY_PORT || 3001));
  const vitePort = await findAvailablePort(Number(process.env.VITE_PORT || 5173));
  startProxy(proxyPort);
  startVite(proxyPort, vitePort);
};

tryStart();
