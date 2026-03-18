# 🚀 Quick Deployment Guide

Choose your deployment method:

---

## Option 1: VPS Deployment (Docker + PM2) ⚡

### Step 1: Setup Server (One-Time)
```bash
# SSH into your server
ssh your-user@your-server-ip

# Download and run setup script
wget https://raw.githubusercontent.com/finarna/teacher-studio/main/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### Step 2: Configure GitHub Secrets
Go to **GitHub → Settings → Secrets → Actions** and add:

```
VPS_HOST=your-server-ip
VPS_USERNAME=deploy
VPS_SSH_KEY=<paste from: cat ~/.ssh/github_deploy_key>
VPS_PORT=22

VITE_GEMINI_API_KEY=your-api-key
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Deploy
```bash
# Push to main branch
git push origin main

# Or trigger manual deployment
# GitHub → Actions → Deploy to VPS → Run workflow
```

### Step 4: Configure Domain (Optional)
```bash
# SSH into server
ssh deploy@your-server-ip

# Edit Nginx config
sudo nano /etc/nginx/sites-available/edujourney
# Update server_name with your domain

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Reload Nginx
sudo systemctl reload nginx
```

✅ **Done!** Your app is live at `http://your-domain.com`

---

## Option 2: Vercel (Frontend Only) 🔷

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login and Deploy
```bash
vercel login
vercel --prod
```

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

✅ **Done!** Auto-deploys on every push to main

---

## Option 3: Netlify (Frontend Only) 🌐

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login and Deploy
```bash
netlify login
netlify init
netlify deploy --prod
```

### Step 3: Add Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables:
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

✅ **Done!** Auto-deploys on every push to main

---

## Option 4: Railway (Full Stack) 🚂

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login and Deploy
```bash
railway login
railway init
railway up
```

### Step 3: Add Environment Variables
```bash
railway variables set SUPABASE_URL=https://xxxxx.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
railway variables set VITE_GEMINI_API_KEY=your-key
railway variables set VITE_SUPABASE_URL=https://xxxxx.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your-key
```

✅ **Done!** Auto-deploys on every push to main

---

## Option 5: Docker (Local or Any Server) 🐳

### Step 1: Create .env file
```bash
cp .env.example .env
# Edit .env with your values
```

### Step 2: Run with Docker Compose
```bash
docker-compose up -d
```

### Step 3: Check Status
```bash
docker-compose logs -f
```

✅ **Done!** App running at `http://localhost:9001`

---

## Monitoring & Logs

### VPS Deployment
```bash
# SSH into server
ssh deploy@your-server-ip

# Check PM2 status
pm2 status

# View logs
pm2 logs edujourney-server

# Restart if needed
pm2 restart edujourney-server
```

### Platform Deployments
- **Vercel**: Dashboard → Deployments → Logs
- **Netlify**: Dashboard → Deploys → Deploy log
- **Railway**: Dashboard → Deployments → Logs

---

## Troubleshooting

### VPS: 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:9001/api/health

# Restart PM2
pm2 restart edujourney-server

# Check Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Build Fails
- Check environment variables are set
- Verify Node.js version is 18+
- Clear cache and rebuild: `npm run build`

### Cannot Connect to Server
- Verify SSH key is added to authorized_keys
- Check firewall allows SSH: `sudo ufw allow ssh`
- Test connection: `ssh -i ~/.ssh/key deploy@server-ip`

---

## Next Steps

1. ✅ Deploy your app
2. 🔒 Enable SSL/HTTPS
3. 📊 Setup monitoring (Uptime Robot, Better Uptime)
4. 🔐 Configure Supabase RLS policies
5. 🚀 Setup CDN (Cloudflare)

---

**Need Help?** See full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
