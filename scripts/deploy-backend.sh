#!/bin/bash

# ADMaps Backend Deployment Script for Azure Web App
# This script deploys the Node.js backend to Azure Web App

set -e  # Exit on any error

echo "🚀 Starting ADMaps Backend Deployment to Azure..."

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

# Configuration
RESOURCE_GROUP="rg-admaps"
BACKEND_APP_NAME="admaps-backend-api"
BACKEND_DIR="backend"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Backend App: $BACKEND_APP_NAME"
echo ""

# Navigate to backend directory
cd "$BACKEND_DIR" || { echo "❌ Backend directory not found"; exit 1; }

echo "📦 Preparing backend for deployment..."

# Install production dependencies
echo "   Installing dependencies..."
npm ci --production

# Create deployment package excluding development files
echo "   Creating deployment package..."
cd ..
zip -r backend-deploy.zip "$BACKEND_DIR" \
    -x "$BACKEND_DIR/node_modules/*" \
    -x "$BACKEND_DIR/.env*" \
    -x "$BACKEND_DIR/*.log" \
    -x "$BACKEND_DIR/.DS_Store" \
    -x "$BACKEND_DIR/test/*" \
    -x "$BACKEND_DIR/tests/*"

echo "☁️  Deploying to Azure Web App..."

# Deploy to Azure
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP_NAME" \
    --src backend-deploy.zip

# Clean up deployment package
rm backend-deploy.zip

echo "⚙️  Configuring app settings..."

# Set required app settings (if not already set)
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP_NAME" \
    --settings \
        NODE_ENV="production" \
        WEBSITE_NODE_DEFAULT_VERSION="~18" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

echo "🔍 Checking deployment status..."

# Wait a moment for deployment to process
sleep 10

# Check if the app is running
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo "   Testing health endpoint: $BACKEND_URL/health"

if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend deployment successful!"
    echo "🌐 Backend URL: $BACKEND_URL"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Configure API keys in Azure App Settings:"
    echo "      - GOOGLE_MAPS_API_KEY"
    echo "      - OPENAI_API_KEY"
    echo "      - JWT_SECRET"
    echo "      - ADMIN_USERNAME (optional, defaults to 'admin')"
    echo "      - ADMIN_PASSWORD (optional, defaults to 'XXXX')"
    echo ""
    echo "   2. Test login endpoint: $BACKEND_URL/login"
    echo "   3. Deploy frontend with VITE_BACKEND_URL=$BACKEND_URL"
else
    echo "⚠️  Backend deployment completed but health check failed."
    echo "   URL: $BACKEND_URL"
    echo "   Check Azure portal for logs and app settings."
fi

echo ""
echo "🎯 Backend deployment process completed!" 