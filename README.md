# Node.js AWS Deployment Demo

## Architecture

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

## Docker installation

Add Docker's official GPG key:

```bash
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Add the repository to Apt sources:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

```bash
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

After installation, verify that Docker is running:

```bash
sudo systemctl status docker
```

If Docker is not running, start it manually:

```bash
sudo systemctl start docker
```

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Clone and Docker deployment

```bash
git clone https://github.com/MureedQasimShah/node.js-aws-deployment-demo.git
cd node.js-aws-deployment-demo
docker compose up -d --build
docker compose ps
```

## Nginx configuration

1. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

Start and enable it:

```bash
sudo systemctl enable --now nginx
```

Check:

```bash
sudo systemctl status nginx
```

2. Remove the default Nginx site

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

3. Create your Nginx configuration

```bash
sudo nano /etc/nginx/sites-available/nodeapp
```

Paste this:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name nodejs-qasim.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header X-EC2-Hostname $hostname;
    }
}
```

Save:

```text
Ctrl + O
Enter
Ctrl + X
```

4. Enable the configuration

```bash
sudo ln -s /etc/nginx/sites-available/nodeapp /etc/nginx/sites-enabled/nodeapp
```

5. Test Nginx configuration

```bash
sudo nginx -t
```

You want:

```text
syntax is ok
test is successful
```

6. Reload Nginx

```bash
sudo systemctl reload nginx
```

## DuckDNS

1. Go to [https://www.duckdns.org](https://www.duckdns.org).
2. Sign in.
3. In the domain box, type `nodejs-qasim`.
4. Click **add domain**.
5. Set the current IP to the EC2 public IPv4 address.
6. Click **update ip**.

The name is `nodejs-qasim.duckdns.org`.

## HTTPS / Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

Request the certificate and configure Nginx:

```bash
sudo certbot --nginx -d nodejs-qasim.duckdns.org
```

Certbot will ask you for:

- Email address. Enter your email.
- Accept the Terms of Service.
- If asked whether to redirect HTTP to HTTPS, choose **2: Redirect**.

This will make `http://nodejs-qasim.duckdns.org` redirect to `https://nodejs-qasim.duckdns.org`.

```bash
sudo systemctl reload nginx
```
