const express = require('express');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

function resolveHostname(req) {
  const fromNginx = req.get('X-EC2-Hostname');

  if (fromNginx && fromNginx.trim()) {
    return fromNginx.trim();
  }

  return os.hostname();
}

function buildHealth(req) {
  return {
    status: 'ok',
    message: 'Node.js application is running',
    environment: 'AWS EC2',
    hostname: resolveHostname(req),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };
}

app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(buildHealth(req));
});

app.get('/api/info', (req, res) => {
  const health = buildHealth(req);

  res.set('Cache-Control', 'no-store');
  res.json({
    application: 'nodejs-aws-deployment-demo',
    environment: health.environment,
    runtime: 'Node.js',
    nodeVersion: health.nodeVersion,
    container: 'Docker',
    reverseProxy: 'Nginx',
    https: 'Enabled',
    hostname: health.hostname,
    platform: os.platform(),
    arch: os.arch(),
    uptimeSeconds: health.uptimeSeconds,
    pid: process.pid,
    port: Number(PORT),
    timestamp: health.timestamp
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
