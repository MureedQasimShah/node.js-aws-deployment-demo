# Node.js AWS Deployment Demo

A small Node.js dashboard used to demonstrate this deployment path:

```text
Node.js → Docker → AWS EC2 → Nginx → HTTPS
```

The application is an Express server and a single static page. It reports whether the app is online, plus the hostname and process uptime. Nothing in this repository creates AWS resources.

## Architecture

Locally, Docker Compose publishes the app only on the host loopback interface:

```text
Browser or curl
        |
http://127.0.0.1:3000
        |
Docker container (nodejs-app)
        |
Node.js on 0.0.0.0:3000
```

On the EC2 instance, Nginx will be the only public entry point. The container stays on localhost:

```text
Internet
   |
HTTPS :443
   |
Nginx on EC2
   |
127.0.0.1:3000
   |
Docker container
   |
Node.js application
```

Port 3000 is bound to `127.0.0.1` in Docker Compose on purpose. The Node.js process must not be reachable directly from the internet.

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
5. Install Nginx and proxy public traffic to `127.0.0.1:3000`.
6. Add HTTPS with a certificate (for example Let's Encrypt).
7. Forward the EC2 hostname with the `X-EC2-Hostname` header.

Leave the security group open for SSH and HTTPS (port 443). Do not open port 3000 to the internet.

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

Nginx terminates HTTPS and reverse-proxies to the container. The Node.js app keeps serving plain HTTP on port 3000 inside the host, and only on localhost.
