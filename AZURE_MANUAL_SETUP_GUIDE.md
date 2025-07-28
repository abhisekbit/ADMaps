# 🌐 Azure Manual Setup Guide for PitStopPal

This guide walks you through manually creating Azure resources via the Azure Portal, then using automated scripts for deployment only.

## 📋 Overview

**Manual Setup (Azure Portal):** Create and configure Azure resources
**Automated Deployment (Scripts):** Deploy code to existing resources

---

## 🏗️ Phase 1: Manual Azure Resource Creation

### Step 1: Create Resource Group

1. **Login to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure account

2. **Create Resource Group**
   - Search for "Resource groups" in the top search bar
   - Click **"+ Create"**
   - **Subscription**: Select your subscription
   - **Resource group**: `rg-pitstoppal`
   - **Region**: `East US` (or your preferred region)
   - Click **"Review + create"** → **"Create"**

### Step 2: Create App Service Plan

1. **Navigate to App Service Plans**
   - Search for "App Service plans" in the search bar
   - Click **"+ Create"**

2. **Basic Configuration**
   - **Subscription**: Your subscription
   - **Resource Group**: `rg-pitstoppal`
   - **Name**: `plan-pitstoppal`
   - **Operating System**: `Linux`
   - **Region**: `East US` (same as resource group)

3. **Pricing Tier**
   - **Sku and size**: Click "Change size"
   - **Production**: Select **"Basic B1"** ($13.14/month)
   - Or **"Standard S1"** ($70/month) for SSL and custom domains
   - Click **"Apply"**

4. **Create Plan**
   - Click **"Review + create"** → **"Create"**

### Step 3: Create Backend Web App

1. **Navigate to App Services**
   - Search for "App Services" in the search bar
   - Click **"+ Create"** → **"Web App"**

2. **Basic Configuration**
   - **Subscription**: Your subscription
   - **Resource Group**: `rg-pitstoppal`
   - **Name**: `pitstoppal-backend-api` (must be globally unique)
   - **Publish**: `Code`
   - **Runtime stack**: `Node 18 LTS`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **App Service Plan**: `plan-pitstoppal`

3. **Monitoring**
   - **Enable Application Insights**: `Yes` (recommended)
   - **Application Insights**: Create new or use existing

4. **Create Backend**
   - Click **"Review + create"** → **"Create"**
   - **Note the URL**: `https://pitstoppal-backend-api.azurewebsites.net`

### Step 4: Create Frontend Web App

1. **Create Another Web App**
   - Go back to App Services → **"+ Create"** → **"Web App"**

2. **Basic Configuration**
   - **Subscription**: Your subscription
   - **Resource Group**: `rg-pitstoppal`
   - **Name**: `pitstoppal-frontend-app` (must be globally unique)
   - **Publish**: `Code`
   - **Runtime stack**: `Node 18 LTS`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **App Service Plan**: `plan-pitstoppal` (same plan)

3. **Create Frontend**
   - Click **"Review + create"** → **"Create"**
   - **Note the URL**: `https://pitstoppal-frontend-app.azurewebsites.net`

---

## 🔧 Phase 2: Configure App Settings

### Backend App Settings

1. **Navigate to Backend App Service**
   - Go to your `pitstoppal-backend-api` app service
   - Click **"Configuration"** in the left menu

2. **Add Application Settings**
   Click **"+ New application setting"** for each:

   ```
   NODE_ENV = production
   WEBSITE_NODE_DEFAULT_VERSION = ~18
   SCM_DO_BUILD_DURING_DEPLOYMENT = true
   JWT_SECRET = PitStopPal2024-Super-Secret-JWT-Key-Change-In-Production
   ADMIN_USERNAME = admin
   ADMIN_PASSWORD = XXXX
   GOOGLE_MAPS_API_KEY = your_google_maps_api_key_here
   OPENAI_API_KEY = your_openai_api_key_here
   ```

3. **Save Settings**
   - Click **"Save"** at the top
   - Wait for the update to complete

### Frontend App Settings

1. **Navigate to Frontend App Service**
   - Go to your `pitstoppal-frontend-app` app service
   - Click **"Configuration"** in the left menu

2. **Add Application Settings**
   ```
   NODE_ENV = production
   WEBSITE_NODE_DEFAULT_VERSION = ~18
   VITE_BACKEND_URL = https://pitstoppal-backend-api.azurewebsites.net
   VITE_GOOGLE_MAPS_API_KEY = your_google_maps_api_key_here
   ```

3. **Save Settings**
   - Click **"Save"** at the top

---

## 🔐 Phase 3: Security Configuration (Optional)

### Enable HTTPS Only

1. **Backend Security**
   - Go to `pitstoppal-backend-api` → **"TLS/SSL settings"**
   - **HTTPS Only**: `On`
   - **Minimum TLS Version**: `1.2`

2. **Frontend Security**
   - Go to `pitstoppal-frontend-app` → **"TLS/SSL settings"**
   - **HTTPS Only**: `On`
   - **Minimum TLS Version**: `1.2`

### CORS Configuration (Backend)

1. **Navigate to Backend CORS**
   - Go to `pitstoppal-backend-api` → **"CORS"**

2. **Configure Allowed Origins**
   ```
   https://pitstoppal-frontend-app.azurewebsites.net
   http://localhost:5173
   http://localhost:3000
   ```

3. **Save CORS Settings**

---

## 📝 Phase 4: Record Configuration Details

Create a file called `azure-config.txt` with your specific details:

```txt
# PitStopPal Azure Configuration
# Created: [DATE]

Resource Group: rg-pitstoppal
App Service Plan: plan-pitstoppal
Region: East US

Backend App Service: pitstoppal-backend-api
Backend URL: https://pitstoppal-backend-api.azurewebsites.net

Frontend App Service: pitstoppal-frontend-app  
Frontend URL: https://pitstoppal-frontend-app.azurewebsites.net

Login Credentials:
Username: admin
Password: XXXX

API Keys:
Google Maps: [YOUR_KEY_HERE]
OpenAI: [YOUR_KEY_HERE]
JWT Secret: PitStopPal2024-Super-Secret-JWT-Key-Change-In-Production
```

---

## ✅ Phase 5: Verification

### Test Backend Health

1. **Open Browser**
   - Navigate to: `https://pitstoppal-backend-api.azurewebsites.net/health`
   - Should see: `{"status":"ok"}`

### Test Frontend Loading

1. **Open Browser**
   - Navigate to: `https://pitstoppal-frontend-app.azurewebsites.net`
   - Should see: Default Node.js welcome page (before deployment)

---

## 🚀 Phase 6: Ready for Deployment

Once manual setup is complete, you can use the deployment scripts:

```bash
# Deploy backend only
./scripts/deploy-backend-only.sh

# Deploy frontend only  
./scripts/deploy-frontend-only.sh

# Deploy both
./scripts/deploy-apps-only.sh
```

---

## 💡 Alternative Resource Names

If your preferred names are taken, try these alternatives:

### Backend Names
- `pitstoppal-api-[random]`
- `pitstoppal-backend-[your-initials]`
- `pitstoppal-server-2024`

### Frontend Names
- `pitstoppal-web-[random]`
- `pitstoppal-frontend-[your-initials]`
- `pitstoppal-app-2024`

---

## 🆘 Troubleshooting

### Common Issues

1. **Name Already Taken**
   - Add numbers or initials to make names unique
   - Try different regions

2. **Subscription Limits**
   - Check your subscription quotas
   - Contact Azure support if needed

3. **Region Availability**
   - Some regions may not have all services
   - Try `West Europe` or `West US 2`

### Getting Help

- **Azure Portal**: Click the **"?"** icon for help
- **Support**: Create a support ticket if needed
- **Documentation**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)

---

## 📊 Cost Estimation

### Basic B1 Plan (~$13.14/month)
- App Service Plan: $13.14
- Two Web Apps: Included
- Storage: ~$0.50
- **Total**: ~$13.64/month

### Standard S1 Plan (~$70/month)
- App Service Plan: $70
- Two Web Apps: Included
- SSL Certificates: Included
- Custom Domains: Included
- **Total**: ~$70/month

---

## ✨ Next Steps

After completing this manual setup:

1. ✅ Azure resources created and configured
2. ✅ App settings properly configured
3. ✅ Security settings enabled
4. ✅ Ready for automated deployment

**Proceed to use the deployment scripts to deploy your PitStopPal application!** 🚀 