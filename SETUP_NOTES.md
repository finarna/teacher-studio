# Teacher Studio Setup Notes

## Port Configuration Changes

The service was reconfigured to run on ports 9000/9001 instead of 11000/11001.

### Files Modified

| File | Change |
|------|--------|
| `vite.config.ts` | Frontend port: 11000 → 9000, API proxy target: 11001 → 9001 |
| `start_high.sh` | FRONTEND_PORT: 11000 → 9000, BACKEND_PORT: 11001 → 9001 |
| `package.json` | dev:all script ports updated |
| `server.js` | Default backend port: 11001 → 9001 |
| `seed-via-api.cjs` | API port: 11001 → 9001 |

### Service Ports

- **Frontend (Vite)**: http://localhost:9000
- **Backend (Express)**: http://localhost:9001

---

## Node.js Setup

The project requires Node.js >= 18. The system had Node.js v12.22.9 which was incompatible.

### nvm Installation

nvm (Node Version Manager) was installed to manage Node.js versions without affecting the system Node.js:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

nvm installs Node.js in `~/.nvm/` - it does not touch the system Node.js at `/usr/bin/node`.

### Node.js 20 Installation

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
```

Installed version: **v20.20.0**

---

## Running the Service

### Option 1: Using start_high.sh (Recommended)

```bash
cd /home/mgm/teacher-studio
bash start_high.sh
```

The script automatically:
- Loads nvm if present
- Kills any existing processes on ports 9000/9001
- Starts the backend server
- Starts the Vite frontend

### Option 2: Manual Start

```bash
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Start both services
cd /home/mgm/teacher-studio
npm run dev:all
```

### Option 3: Start Services Separately

```bash
# Terminal 1 - Backend
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20
cd /home/mgm/teacher-studio
PORT=9001 node server.js

# Terminal 2 - Frontend
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20
cd /home/mgm/teacher-studio
npx vite --port 9000 --host 0.0.0.0
```

---

## Dependencies

Install dependencies before first run:

```bash
cd /home/mgm/teacher-studio
npm install
```

---

## Service Dependencies

- **Redis**: Connects to 106.51.142.79:6379 (configured in server.js)
- **Gemini API**: Requires `GEMINI_API_KEY` environment variable

---

## Verification

After starting, verify services are running:

```bash
# Check ports
ss -tlnp | grep -E '9000|9001'

# Test backend health
curl http://localhost:9001/api/health

# Frontend should be accessible at
# http://localhost:9000
```
