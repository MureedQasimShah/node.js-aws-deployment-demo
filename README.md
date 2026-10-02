# Node.js AWS Deployment Demo

A small Node.js dashboard used to demonstrate this deployment path:

```text
Node.js → Docker → AWS EC2 → Nginx → HTTPS
```

The application is an Express server and a single static page. It reports whether the app is online, plus the hostname and process uptime. Nothing in this repository creates AWS resources.

## Architecture

Docker Compose publishes port 3000 on every host interface (`0.0.0.0`):

```text
Browser or curl
        |
http://<host>:3000
        |
Docker container (nodejs-app)
        |
Node.js on 0.0.0.0:3000
```

`0.0.0.0:3000:3000` means the host accepts connections on port 3000 from localhost and from other machines that can reach the host. On EC2, open port 3000 in the security group if you want to reach the app directly. Nginx can still proxy to `127.0.0.1:3000` later, because that address is included when the port is published on all interfaces.

## Local prerequisites

- Node.js 18 or newer (Node.js 22 matches the Docker image)
- npm
- Docker Engine with the Docker Compose plugin

Check the tools:

```bash
node -v
npm -v
docker compose version
```

## Run locally without Docker

From the project directory:

```bash
npm install
npm start
```

The server listens on `0.0.0.0:3000`. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Stop the server with `Ctrl+C`.

## Build and run with Docker Compose

```bash
docker compose up -d --build
```

Check that the container is running:

```bash
docker compose ps
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Stop and remove the container:

```bash
docker compose down
```

## Test the health endpoint

```bash
curl http://127.0.0.1:3000/api/health
```

A healthy response looks like this:

```json
{
  "status": "ok",
  "message": "Node.js application is running",
  "environment": "AWS EC2",
  "hostname": "your-hostname",
  "nodeVersion": "v22.x.x",
  "uptimeSeconds": 12,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Runtime details are also available at:

```bash
curl http://127.0.0.1:3000/api/info
```

The dashboard calls `/api/health` about once per second and updates the hostname and uptime without reloading the page. If the API cannot be reached, the page shows **APPLICATION OFFLINE**.

## How the hostname works

The hostname is chosen per request:

1. If the request includes an `X-EC2-Hostname` header, that value is used.
2. Otherwise the server uses `os.hostname()`.

Uptime always comes from `process.uptime()`.

Try the header locally:

```bash
curl -H "X-EC2-Hostname: ip-10-0-1-25" http://127.0.0.1:3000/api/health
```

On EC2, Nginx can pass the real instance hostname into the container:

```nginx
proxy_set_header X-EC2-Hostname $hostname;
```

Inside Docker, `os.hostname()` is the container ID. The header lets the dashboard show the EC2 hostname instead.

## Deploying later on AWS EC2

This repository does not deploy anything. A typical follow-up on a fresh EC2 instance is:

1. Install Docker and the Docker Compose plugin.
2. Clone this repository onto the instance.
3. Start the app with `docker compose up -d --build`.
4. Confirm `curl http://127.0.0.1:3000/api/health` works on the instance.
5. Open port 3000 in the security group when the app should be reachable from outside the instance.
6. Install Nginx and proxy public traffic to `127.0.0.1:3000` if you add HTTPS later.
7. Add HTTPS with a certificate (for example Let's Encrypt).
8. Forward the EC2 hostname with the `X-EC2-Hostname` header.

## Future architecture with Nginx and HTTPS

```text
Internet
   |
HTTPS :443
   |
Nginx on EC2
   |
127.0.0.1:3000
   |
Docker container (nodejs-app)
   |
Node.js application
```

Nginx can terminate HTTPS and reverse-proxy to the container. The Node.js app still serves plain HTTP on port 3000. Because Compose publishes `0.0.0.0:3000`, that same port is also reachable on the instance's other network interfaces.
