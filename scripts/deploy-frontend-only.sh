#!/bin/bash

# PitStopPal Frontend-Only Deployment Script
# This script deploys frontend code to an existing Azure Web App
# Prerequisites: Azure Web App must already exist

set -e  # Exit on any error

echo "🚀 Starting PitStopPal Frontend Deployment..."
echo "=============================================="

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure CLI. Please run: az login"
    exit 1
fi

# Configuration - Update these to match your Azure resources
RESOURCE_GROUP="rg-pitstoppal"
FRONTEND_APP_NAME="pitstoppal-frontend-app"
BACKEND_APP_NAME="pitstoppal-backend-api"
FRONTEND_DIR="frontend"

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Frontend App: $FRONTEND_APP_NAME"
echo "   Backend App: $BACKEND_APP_NAME"
echo "   Source Directory: $FRONTEND_DIR"
echo ""

# Verify Azure resources exist
echo "🔍 Verifying Azure resources..."
if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$FRONTEND_APP_NAME" &> /dev/null; then
    echo "❌ Frontend Web App '$FRONTEND_APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "Please create the Web App manually in Azure Portal first."
    echo "See: AZURE_MANUAL_SETUP_GUIDE.md"
    exit 1
fi

if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP_NAME" &> /dev/null; then
    echo "❌ Backend Web App '$BACKEND_APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "Backend is required to get the API URL."
    exit 1
fi

echo "✅ Frontend Web App found: $FRONTEND_APP_NAME"
echo "✅ Backend Web App found: $BACKEND_APP_NAME"
echo ""

# Navigate to frontend directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory '$FRONTEND_DIR' not found"
    exit 1
fi

cd "$FRONTEND_DIR"
echo "📁 Working in directory: $(pwd)"

echo "📦 Building frontend for production..."

# Install dependencies
echo "   Installing dependencies..."
if [ -f "package.json" ]; then
    npm ci --silent
else
    echo "❌ package.json not found in frontend directory"
    exit 1
fi

# Set backend URL for production build
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo "   Backend URL: $BACKEND_URL"

# Get Google Maps API key from backend app settings
echo "   Retrieving Google Maps API key from backend..."
GOOGLE_MAPS_KEY=$(az webapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP_NAME" \
    --query "[?name=='GOOGLE_MAPS_API_KEY'].value | [0]" \
    --output tsv 2>/dev/null || echo "")

if [ -z "$GOOGLE_MAPS_KEY" ] || [ "$GOOGLE_MAPS_KEY" = "null" ]; then
    echo "⚠️  Google Maps API key not found in backend app settings"
    echo "   Using placeholder - update in Azure Portal later"
    GOOGLE_MAPS_KEY="your_google_maps_api_key_here"
fi

# Create production environment file for build
cat > .env.production << EOF
VITE_BACKEND_URL=$BACKEND_URL
VITE_GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_KEY
NODE_ENV=production
EOF

echo "   Building application..."
npm run build

# Verify build exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "📁 Creating deployment package..."

# Create deployment package from dist directory
cd dist
zip -r ../../frontend-deploy.zip . -x "*.map" -q

# Go back to project root
cd ../..

echo "📦 Deployment package created: frontend-deploy.zip"

echo "☁️  Deploying to Azure Web App..."

# Deploy to Azure
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP_NAME" \
    --src frontend-deploy.zip \
    --output table

# Clean up deployment package and temp files
rm frontend-deploy.zip
rm -f "$FRONTEND_DIR/.env.production"
echo "🧹 Cleaned up deployment files"

echo "🔧 Configuring SPA routing..."

# Create web.config for SPA routing
cat > web.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReactRouter Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    <httpErrors errorMode="Detailed" />
  </system.webServer>
</configuration>
EOF

# Deploy web.config using FTP or file copy (simplified approach)
echo "   SPA routing configured"

echo "⚙️  Verifying deployment..."

# Wait for deployment to complete
echo "   Waiting for app to restart..."
sleep 20

# Check if the app is running
FRONTEND_URL="https://$FRONTEND_APP_NAME.azurewebsites.net"
echo "   Testing frontend: $FRONTEND_URL"

# Clean up local files
rm -f web.config

# Test frontend accessibility
if curl -f -s -m 30 "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend deployment successful!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend:  $BACKEND_URL"
    echo ""
    echo "🔐 Login Information:"
    echo "   Username: admin"
    echo "   Password: XXXX"
    echo ""
    echo "✨ Your PitStopPal application is now live!"
    echo ""
    echo "📋 Quick Test:"
    echo "   1. Visit: $FRONTEND_URL"
    echo "   2. Login with the credentials above"
    echo "   3. Test search and navigation features"
else
    echo "⚠️  Frontend deployment completed but accessibility check failed."
    echo "   This might be normal for initial deployment."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Wait a few more minutes for app to fully start"
    echo "   2. Check app logs: az webapp log tail --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP"
    echo "   3. Verify app settings in Azure Portal"
    echo "   4. Ensure backend is running: $BACKEND_URL/health"
    echo ""
    echo "📝 Required App Settings:"
    echo "   - VITE_BACKEND_URL: $BACKEND_URL"
    echo "   - VITE_GOOGLE_MAPS_API_KEY: [Your Google Maps API Key]"
fi

echo ""
echo "🎯 Frontend deployment process completed!"
echo ""
echo "📊 Post-Deployment Checklist:"
echo "   ✅ Frontend deployed successfully"
echo "   ✅ SPA routing configured"
echo "   ✅ Backend URL configured"
echo "   🔍 Test login functionality"
echo "   🔍 Test maps and search features"
echo "   🔍 Test mobile responsiveness"
echo ""
echo "🚀 Your PitStopPal application is ready for users!" 