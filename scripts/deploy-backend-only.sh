#!/bin/bash

# PitStopPal Backend-Only Deployment Script
# This script deploys backend code to an existing Azure Web App
# Prerequisites: Azure Web App must already exist

set -e  # Exit on any error

echo "🚀 Starting PitStopPal Backend Deployment..."
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
BACKEND_APP_NAME="pitstoppal-backend-api"
BACKEND_DIR="backend"

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Backend App: $BACKEND_APP_NAME"
echo "   Source Directory: $BACKEND_DIR"
echo ""

# Verify Azure resources exist
echo "🔍 Verifying Azure resources..."
if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP_NAME" &> /dev/null; then
    echo "❌ Backend Web App '$BACKEND_APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "Please create the Web App manually in Azure Portal first."
    echo "See: AZURE_MANUAL_SETUP_GUIDE.md"
    exit 1
fi

echo "✅ Backend Web App found: $BACKEND_APP_NAME"
echo ""

# Navigate to backend directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory '$BACKEND_DIR' not found"
    exit 1
fi

cd "$BACKEND_DIR"
echo "📁 Working in directory: $(pwd)"

echo "📦 Preparing backend for deployment..."

# Install production dependencies
echo "   Installing production dependencies..."
if [ -f "package.json" ]; then
    npm ci --production --silent
else
    echo "❌ package.json not found in backend directory"
    exit 1
fi

# Create deployment package excluding development files
echo "   Creating deployment package..."
cd ..
zip -r backend-deploy.zip "$BACKEND_DIR" \
    -x "$BACKEND_DIR/node_modules/*" \
    -x "$BACKEND_DIR/.env*" \
    -x "$BACKEND_DIR/*.log" \
    -x "$BACKEND_DIR/.DS_Store" \
    -x "$BACKEND_DIR/test/*" \
    -x "$BACKEND_DIR/tests/*" \
    -x "$BACKEND_DIR/coverage/*" \
    -q

echo "📦 Deployment package created: backend-deploy.zip"

echo "☁️  Deploying to Azure Web App..."

# Deploy to Azure
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP_NAME" \
    --src backend-deploy.zip \
    --output table

# Clean up deployment package
rm backend-deploy.zip
echo "🧹 Cleaned up deployment package"

echo "⚙️  Verifying deployment..."

# Wait for deployment to complete
echo "   Waiting for app to restart..."
sleep 15

# Check if the app is running
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo "   Testing health endpoint: $BACKEND_URL/health"

# Test health endpoint
if curl -f -s -m 30 "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend deployment successful!"
    echo ""
    echo "🌐 Backend URL: $BACKEND_URL"
    echo "🔍 Health Check: $BACKEND_URL/health"
    echo "🔐 Login Endpoint: $BACKEND_URL/login"
    echo ""
    echo "📋 Test Login:"
    echo "   curl -X POST $BACKEND_URL/login \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"username\":\"admin\",\"password\":\"XXXX\"}'"
    echo ""
else
    echo "⚠️  Backend deployment completed but health check failed."
    echo "   This might be normal for initial deployment."
    echo "   Check the following:"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Wait a few more minutes for app to fully start"
    echo "   2. Check app logs: az webapp log tail --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
    echo "   3. Verify app settings in Azure Portal"
    echo "   4. Check if all required environment variables are set"
    echo ""
    echo "📝 Required App Settings:"
    echo "   - GOOGLE_MAPS_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - JWT_SECRET"
    echo "   - ADMIN_USERNAME"
    echo "   - ADMIN_PASSWORD"
fi

echo ""
echo "🎯 Backend deployment process completed!"
echo ""
echo "📊 Next Steps:"
echo "   1. Test the health endpoint manually"
echo "   2. Verify login functionality"
echo "   3. Deploy frontend with: ./scripts/deploy-frontend-only.sh"
echo "   4. Update frontend VITE_BACKEND_URL to: $BACKEND_URL" 