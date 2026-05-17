const { createServer } = require('net');
const { execSync, spawn } = require('child_process');
const { request } = require('http');

const BACKEND_PORT = 3001;
const PROXY_PORT = 3000;

// Start Next.js standalone
const next = spawn('node', ['.next/standalone/server.js'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: String(BACKEND_PORT) },
  stdio: ['pipe', 'pipe', 'pipe']
});

next.stdout.on('data', d => process.stdout.write(d));
next.stderr.on('data', d => process.stderr.write(d));
next.on('exit', () => { console.log('Next.js died, exiting...'); process.exit(1); });

// Wait for Next.js to be ready
function waitReady() {
  return new Promise(resolve => {
    const check = () => {
      const req = request({ hostname: '127.0.0.1', port: BACKEND_PORT, path: '/', method: 'GET', timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else setTimeout(check, 500);
      });
      req.on('error', () => setTimeout(check, 500));
      req.end();
    };
    check();
  });
}

waitReady().then(() => {
  console.log('Next.js ready, starting proxy...');
  
  // TCP proxy: IPv6 [::]:3000 -> IPv4 127.0.0.1:3001
  const proxy = createServer((client) => {
    const backend = require('net').createConnection({ host: '127.0.0.1', port: BACKEND_PORT }, () => {
      client.pipe(backend);
      backend.pipe(client);
    });
    backend.on('error', () => client.destroy());
    client.on('error', () => backend.destroy());
  });

  proxy.listen(PROXY_PORT, '::', () => {
    console.log(`TCP proxy: [::]:${PROXY_PORT} -> 127.0.0.1:${BACKEND_PORT}`);
  });
});
