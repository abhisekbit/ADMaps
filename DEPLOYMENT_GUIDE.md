# PitStopPal Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Azure CLI installed and logged in
- Docker Desktop running
- Node.js and npm installed

### One-Command Deployment
```bash
./azure-deploy.sh
```

This will:
1. Build the frontend and backend
2. Create Docker images
3. Push to Azure Container Registry
4. Deploy to Azure Web App

---

## 📋 Manual Deployment Steps

### 1. Environment Setup

#### Azure Resources (Already Created)
- **Resource Group**: `rg-pitstoppal-1`
- **Web App**: `pitstoppal-webapp`
- **Container Registry**: `pitstoppalacr`
- **App Configuration**: `pitstoppal-appconfig`

#### Required Environment Variables

**For Production (Azure App Configuration):**
- `OPENAI_API_KEY` - Your OpenAI API key
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key
- `JWT_SECRET` - Secret for JWT token generation
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD` - Admin login password

**For Local Development (.env file):**
```bash
# Copy template and fill in your values
cp env.local.example .env
```

Then edit `.env` with your actual API keys and secrets.

### 2. Local Development

#### Setup Local Environment
```bash
# Set up local development environment
./setup-local.sh
```

This will:
1. Create `.env` file from template
2. Install dependencies
3. Check environment variables
4. Provide setup instructions

#### Start with Docker Compose
```bash
docker-compose up
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4001

#### Test Locally
```bash
./test-local.sh
```

### 3. Deployment Scenarios

#### Scenario A: Full Deployment (Frontend + Backend Changes)
```bash
# Clean build and deploy everything
rm -rf frontend/dist backend/public
./azure-deploy.sh
```

#### Scenario B: Backend Only Changes
```bash
# Deploy only backend changes
cd backend
docker build --no-cache --platform=linux/amd64 -t pitstoppalacr.azurecr.io/pitstoppal-backend:latest .
docker push pitstoppalacr.azurecr.io/pitstoppal-backend:latest
cd ..
az webapp restart --name pitstoppal-webapp --resource-group rg-pitstoppal-1
```

#### Scenario C: Frontend Only Changes
```bash
# Build frontend and update backend
cd frontend
npm ci
npm run build
cd ..
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

# Deploy updated backend
cd backend
docker build --no-cache --platform=linux/amd64 -t pitstoppalacr.azurecr.io/pitstoppal-backend:latest .
docker push pitstoppalacr.azurecr.io/pitstoppal-backend:latest
cd ..
az webapp restart --name pitstoppal-webapp --resource-group rg-pitstoppal-1
```

#### Scenario D: Environment Variables Update
```bash
# Update App Configuration
az appconfig kv set --name pitstoppal-appconfig --key OPENAI_API_KEY --value "your-new-key"
az appconfig kv set --name pitstoppal-appconfig --key GOOGLE_MAPS_API_KEY --value "your-new-key"

# Restart web app to pick up changes
az webapp restart --name pitstoppal-webapp --resource-group rg-pitstoppal-1
```

### 4. Troubleshooting

#### Check Application Status
```bash
# Check web app status
az webapp show --name pitstoppal-webapp --resource-group rg-pitstoppal-1

# View logs
az webapp log tail --name pitstoppal-webapp --resource-group rg-pitstoppal-1
```

#### Common Issues

**1. Mixed Content Error**
- Clear browser cache or use incognito mode
- Ensure frontend is using relative URLs (not hardcoded IPs)

**2. Docker Build Issues**
- Use `--no-cache` flag for fresh builds
- Ensure `--platform=linux/amd64` for Apple Silicon

**3. Environment Variables Not Loading**
- Check Azure App Configuration connection
- Verify environment variable names match exactly

**4. Application Not Starting**
- Check Docker image logs
- Verify port 8080 is exposed
- Check health endpoint: `/health`

### 5. Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Azure Web     │
│   (React/Vite)  │───▶│   (Node.js)     │───▶│     App         │
│                 │    │                 │    │                 │
│ - Static files  │    │ - API endpoints │    │ - Container     │
│ - SPA routing   │    │ - Static serve  │    │ - HTTPS         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 6. URLs and Endpoints

#### Production
- **Application**: https://pitstoppal-webapp-ckcqehfyd4b2aqfj.eastus2-01.azurewebsites.net
- **Health Check**: `/health`
- **API Endpoints**: `/login`, `/search`, `/directions`, `/recalculate-route`, `/add-stop`

#### Local Development
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4001

### 7. File Structure
```
ADMaps/
├── backend/                 # Node.js backend
│   ├── index.js            # Main server file
│   ├── config.js           # Azure App Configuration
│   ├── Dockerfile          # Backend container
│   └── public/             # Frontend build (copied)
├── frontend/               # React frontend
│   ├── src/                # React source code
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── azure-deploy.sh         # Main deployment script
├── test-local.sh           # Local testing script
├── docker-compose.yml      # Local development
├── azure-app-config-setup.sh # App Configuration setup
└── DEPLOYMENT_GUIDE.md    # This file
```

### 8. Best Practices

#### Development
- Always test locally with `./test-local.sh` before deploying
- Use relative URLs in frontend API calls
- Keep environment variables in Azure App Configuration

#### Deployment
- Use `--no-cache` for Docker builds when making changes
- Always specify `--platform=linux/amd64` for cross-platform builds
- Restart web app after deployment to ensure changes take effect

#### Monitoring
- Check application logs regularly
- Monitor health endpoint for application status
- Use Azure Application Insights for detailed monitoring

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `./azure-deploy.sh` | Full deployment |
| `./test-local.sh` | Local testing |
| `docker-compose up` | Local development |
| `az webapp restart` | Restart web app |
| `az webapp log tail` | View live logs |

**Application URL**: https://pitstoppal-webapp-ckcqehfyd4b2aqfj.eastus2-01.azurewebsites.net 