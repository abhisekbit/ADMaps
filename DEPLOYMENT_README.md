# 🚀 PitStopPal Azure Deployment Guide

## 📋 Two-Phase Deployment Approach

### Phase 1: Manual Azure Setup (One-time)
**Use Azure Portal UI to create resources**

```bash
# Follow the detailed guide
📖 See: AZURE_MANUAL_SETUP_GUIDE.md
```

**What you'll create:**
- ✅ Resource Group: `rg-pitstoppal`
- ✅ App Service Plan: `plan-pitstoppal`
- ✅ Backend Web App: `pitstoppal-backend-api`
- ✅ Frontend Web App: `pitstoppal-frontend-app`
- ✅ App Settings and Configuration

### Phase 2: Automated Code Deployment
**Use deployment scripts for fast, repeatable deployments**

```bash
# Option 1: Deploy both apps
./scripts/deploy-apps-only.sh

# Option 2: Deploy individually
./scripts/deploy-backend-only.sh
./scripts/deploy-frontend-only.sh
```

---

## 🎯 Quick Start

### Prerequisites
1. ✅ Azure CLI installed and logged in (`az login`)
2. ✅ Azure resources created (see AZURE_MANUAL_SETUP_GUIDE.md)
3. ✅ API keys configured in Azure App Settings

### Deploy Your App
```bash
# 1. Verify Azure resources exist
az webapp list --resource-group rg-pitstoppal --output table

# 2. Deploy both applications
./scripts/deploy-apps-only.sh

# 3. Access your app
# Frontend: https://pitstoppal-frontend-app.azurewebsites.net
# Login: admin / XXXX
```

---

## 📂 Script Overview

| Script | Purpose | Prerequisites |
|--------|---------|---------------|
| `deploy-backend-only.sh` | Deploy backend API only | Backend Web App exists |
| `deploy-frontend-only.sh` | Deploy frontend app only | Frontend Web App exists |
| `deploy-apps-only.sh` | Deploy both applications | Both Web Apps exist |
| `deploy-all.sh` | Create resources + deploy | Azure CLI access (legacy) |

---

## 🔧 Configuration

### Default Resource Names
Update these in the scripts if your names differ:

```bash
RESOURCE_GROUP="rg-pitstoppal"
BACKEND_APP_NAME="pitstoppal-backend-api"
FRONTEND_APP_NAME="pitstoppal-frontend-app"
```

### Required App Settings
**Backend:**
- `GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY` 
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

**Frontend:**
- `VITE_BACKEND_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

---

## 🆘 Troubleshooting

### Common Issues

1. **"Web App not found"**
   ```bash
   # Verify resources exist
   az webapp list --resource-group rg-pitstoppal
   
   # Create missing resources using AZURE_MANUAL_SETUP_GUIDE.md
   ```

2. **"Health check failed"**
   ```bash
   # Check backend logs
   az webapp log tail --name pitstoppal-backend-api --resource-group rg-pitstoppal
   
   # Verify app settings in Azure Portal
   ```

3. **"Build failed"**
   ```bash
   # Install dependencies locally first
   cd frontend && npm install
   cd ../backend && npm install
   ```

### Get Help
- 📖 **Detailed Setup**: `AZURE_MANUAL_SETUP_GUIDE.md`
- 📖 **Full Plan**: `DEPLOYMENT_PLAN.md`
- 🌐 **Azure Portal**: [portal.azure.com](https://portal.azure.com)

---

## ✨ Benefits of This Approach

✅ **Manual Resource Creation**
- Full control over Azure configuration
- Visual feedback during setup
- Easy to customize resource names
- Step-by-step guidance

✅ **Automated Deployment**
- Fast, repeatable deployments
- No accidental resource deletion
- Focus on code deployment only
- Easy CI/CD integration later

✅ **Best of Both Worlds**
- Stability + Flexibility
- Learning + Automation
- Control + Efficiency

---

**Ready to deploy? Start with `AZURE_MANUAL_SETUP_GUIDE.md` → then run `./scripts/deploy-apps-only.sh`** 🚀 