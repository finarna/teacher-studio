# 🚀 EduJourney Deployment Guide

Complete guide for deploying EduJourney to VPS (Docker + PM2) or cloud platforms (Vercel/Netlify/Railway).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [VPS Deployment (Docker + PM2)](#vps-deployment)
3. [Platform Deployment](#platform-deployment)
4. [GitHub Actions Setup](#github-actions-setup)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 18+
- Git
- SSH access to VPS (for VPS deployment)
- GitHub account with repository access

### Required Secrets
- Supabase credentials
- Gemini API key
- Server credentials (for VPS)

---

## VPS Deployment (Docker + PM2)

### Step 1: Server Setup

#### 1.1 Connect to Your VPS
```bash
ssh your-user@your-server-ip
```

#### 1.2 Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Docker (optional, for Docker deployment)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Nginx (for serving frontend)
sudo apt install -y nginx
```

#### 1.3 Create Deployment User
```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Switch to deploy user
su - deploy

# Install PM2 for deploy user
npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Run the command it outputs
```

### Step 2: SSH Key Setup

#### 2.1 Generate SSH Key on Your VPS (as deploy user)
```bash
# On VPS
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (copy this for GitHub Secrets)
cat ~/.ssh/github_deploy_key
```

#### 2.2 Test SSH Connection
```bash
# From your local machine
ssh -i path/to/github_deploy_key deploy@your-server-ip
```

### Step 3: Create Deployment Directory
```bash
# On VPS as deploy user
mkdir -p /var/www/edujourney
cd /var/www/edujourney

# Create environment file
cat > .env.production << 'EOF'
# Backend Environment Variables
NODE_ENV=production
PORT=9001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Redis
REDIS_URL=redis://localhost:6379
EOF

chmod 600 .env.production
```

### Step 4: Configure Nginx (Frontend Proxy)
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/edujourney
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (Static Files)
    root /var/www/edujourney/current/dist;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/edujourney /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL (Optional but Recommended)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (runs automatically)
sudo systemctl status certbot.timer
```

---

## Platform Deployment

### Option 1: Vercel (Frontend Only)

#### 1.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 1.2 Deploy
```bash
# Login
vercel login

# Deploy
vercel --prod
```

#### 1.3 Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Option 2: Railway (Backend + Frontend)

#### 2.1 Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2.2 Deploy
```bash
# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

#### 2.3 Add Environment Variables
```bash
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Option 3: Netlify (Frontend Only)

#### 3.1 Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### 3.2 Deploy
```bash
# Login
netlify login

# Deploy
netlify deploy --prod
```

---

## GitHub Actions Setup

### Step 1: Add GitHub Secrets

Go to **GitHub Repository → Settings → Secrets and Variables → Actions** and add:

#### For VPS Deployment:
```
VPS_HOST=your-server-ip
VPS_USERNAME=deploy
VPS_SSH_KEY=<paste private key from ~/.ssh/github_deploy_key>
VPS_PORT=22
```

#### For All Deployments:
```
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### For Platform Deployments (Optional):
```
VERCEL_TOKEN=your-vercel-token
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
RAILWAY_TOKEN=your-railway-token
DOCKERHUB_USERNAME=your-username
DOCKERHUB_TOKEN=your-token
```

### Step 2: Configure Deployment Target

Go to **GitHub Repository → Settings → Variables → Actions** and add:

```
DEPLOY_TARGET=vps
# Options: vps, vercel, netlify, railway, docker, all
```

### Step 3: Trigger Deployment

Deployments trigger automatically on push to `main` branch.

Manual deployment:
1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**

---

## Environment Variables

### Frontend (.env or build-time)
```bash
VITE_GEMINI_API_KEY=AIzaSy...
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### Backend (runtime)
```bash
NODE_ENV=production
PORT=9001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
REDIS_URL=redis://localhost:6379  # Optional
```

---

## Docker Deployment

### Local Testing
```bash
# Build image
docker build -t edujourney:latest \
  --build-arg VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  .

# Run container
docker run -d \
  --name edujourney \
  -p 9001:9001 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  edujourney:latest

# Check logs
docker logs -f edujourney
```

### Using Docker Compose
```bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Troubleshooting

### Common Issues

#### 1. PM2 Process Not Starting
```bash
# Check PM2 logs
pm2 logs edujourney-server

# Restart PM2
pm2 restart edujourney-server

# Delete and restart
pm2 delete edujourney-server
pm2 start ecosystem.config.js
```

#### 2. Nginx 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:9001/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 3. Port Already in Use
```bash
# Find process using port 9001
sudo lsof -i :9001

# Kill process
sudo kill -9 <PID>
```

#### 4. Permission Denied
```bash
# Fix ownership
sudo chown -R deploy:deploy /var/www/edujourney

# Fix permissions
chmod 755 /var/www/edujourney
chmod 644 /var/www/edujourney/.env.production
```

#### 5. GitHub Actions SSH Fails
```bash
# Verify SSH key is correct
ssh -i ~/.ssh/github_deploy_key deploy@your-server-ip

# Check authorized_keys
cat ~/.ssh/authorized_keys

# Verify key format (should be single line, no line breaks)
```

---

## Monitoring

### PM2 Monitoring
```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Save PM2 process list
pm2 save
```

### Server Monitoring
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

---

## Security Checklist

- [ ] Use SSH keys (no password auth)
- [ ] Configure firewall (ufw)
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Set proper file permissions (644 for files, 755 for dirs)
- [ ] Use environment variables (never commit secrets)
- [ ] Enable Supabase RLS (Row Level Security)
- [ ] Keep system updated (`sudo apt update && sudo apt upgrade`)
- [ ] Use strong passwords
- [ ] Limit SSH access (disable root login)
- [ ] Monitor logs regularly

---

## Next Steps

1. Set up monitoring (optional): Install Uptime Robot, Better Uptime, or similar
2. Configure CDN (optional): Cloudflare for caching and DDoS protection
3. Set up backups: Automated database backups
4. Performance: Enable Redis caching if needed

---

## Support

If you encounter issues:
1. Check logs: `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
2. Verify environment variables are set correctly
3. Check GitHub Actions logs for deployment failures
4. Review this guide's troubleshooting section

---

**Last Updated**: 2026-02-04
