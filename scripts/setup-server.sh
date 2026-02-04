#!/bin/bash

# ============================================
# EduJourney Server Setup Script
# Run this on your VPS to prepare for deployment
# ============================================

set -e

echo "🚀 Starting EduJourney Server Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}❌ Please do not run as root. Run as regular user with sudo access.${NC}"
   exit 1
fi

# ============================================
# Step 1: Update System
# ============================================
echo -e "${GREEN}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# ============================================
# Step 2: Install Node.js 18
# ============================================
echo -e "${GREEN}📦 Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"
else
    echo -e "${YELLOW}⏭️  Node.js already installed: $(node -v)${NC}"
fi

# ============================================
# Step 3: Install PM2
# ============================================
echo -e "${GREEN}📦 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${YELLOW}⏭️  PM2 already installed${NC}"
fi

# ============================================
# Step 4: Setup PM2 Startup
# ============================================
echo -e "${GREEN}⚙️  Configuring PM2 startup...${NC}"
pm2 startup | grep -v "PM2" | sudo bash
echo -e "${GREEN}✅ PM2 startup configured${NC}"

# ============================================
# Step 5: Install Nginx
# ============================================
echo -e "${GREEN}📦 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo -e "${GREEN}✅ Nginx installed and started${NC}"
else
    echo -e "${YELLOW}⏭️  Nginx already installed${NC}"
fi

# ============================================
# Step 6: Install Certbot (for SSL)
# ============================================
echo -e "${GREEN}📦 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${YELLOW}⏭️  Certbot already installed${NC}"
fi

# ============================================
# Step 7: Create Deployment Directory
# ============================================
echo -e "${GREEN}📁 Creating deployment directory...${NC}"
DEPLOY_DIR="/var/www/edujourney"
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR
echo -e "${GREEN}✅ Deployment directory created: $DEPLOY_DIR${NC}"

# ============================================
# Step 8: Setup SSH for GitHub Actions
# ============================================
echo -e "${GREEN}🔑 Setting up SSH key for GitHub Actions...${NC}"
SSH_DIR="$HOME/.ssh"
mkdir -p $SSH_DIR
chmod 700 $SSH_DIR

if [ ! -f "$SSH_DIR/github_deploy_key" ]; then
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$SSH_DIR/github_deploy_key" -N ""
    cat "$SSH_DIR/github_deploy_key.pub" >> "$SSH_DIR/authorized_keys"
    chmod 600 "$SSH_DIR/authorized_keys"
    echo -e "${GREEN}✅ SSH key generated${NC}"
else
    echo -e "${YELLOW}⏭️  SSH key already exists${NC}"
fi

# ============================================
# Step 9: Create Environment File Template
# ============================================
echo -e "${GREEN}📝 Creating environment file template...${NC}"
ENV_FILE="$DEPLOY_DIR/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    cat > $ENV_FILE << 'EOF'
# Backend Environment Variables
NODE_ENV=production
PORT=9001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Redis
REDIS_URL=redis://localhost:6379
EOF
    chmod 600 $ENV_FILE
    echo -e "${GREEN}✅ Environment file created: $ENV_FILE${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit $ENV_FILE with your actual values${NC}"
else
    echo -e "${YELLOW}⏭️  Environment file already exists${NC}"
fi

# ============================================
# Step 10: Configure Firewall (UFW)
# ============================================
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw status
    echo -e "${GREEN}✅ Firewall configured${NC}"
else
    echo -e "${YELLOW}⏭️  UFW not installed, skipping firewall setup${NC}"
fi

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}🎉 Server setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Edit environment file:"
echo "   nano $ENV_FILE"
echo ""
echo "2. Copy this private key to GitHub Secrets (VPS_SSH_KEY):"
echo "   cat $SSH_DIR/github_deploy_key"
echo ""
echo "3. Your server IP (add as VPS_HOST secret):"
echo "   $(hostname -I | awk '{print $1}')"
echo ""
echo "4. Configure Nginx for your domain:"
echo "   sudo nano /etc/nginx/sites-available/edujourney"
echo ""
echo "5. Enable SSL certificate:"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""
echo -e "${GREEN}✅ Ready for GitHub Actions deployment!${NC}"
