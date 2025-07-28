#!/bin/bash

# ADMaps Complete Deployment Script for Azure
# This script creates Azure resources and deploys both backend and frontend

set -e  # Exit on any error

echo "🚀 Starting Complete ADMaps Deployment to Azure..."
echo "======================================================="

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
LOCATION="East US"
APP_SERVICE_PLAN="plan-admaps"
BACKEND_APP_NAME="admaps-backend-api"
FRONTEND_APP_NAME="admaps-frontend-app"

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo "   App Service Plan: $APP_SERVICE_PLAN"
echo "   Backend App: $BACKEND_APP_NAME"
echo "   Frontend App: $FRONTEND_APP_NAME"
echo ""

# Get current subscription info
SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
echo "📊 Azure Subscription: $SUBSCRIPTION_NAME"
echo ""

read -p "🤔 Do you want to continue with this deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "☁️  Creating Azure Resources..."
echo "================================="

# Create resource group if it doesn't exist
echo "📁 Creating resource group..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output table

echo ""

# Create App Service Plan if it doesn't exist
echo "🏗️  Creating App Service Plan..."
if ! az appservice plan show --resource-group "$RESOURCE_GROUP" --name "$APP_SERVICE_PLAN" &> /dev/null; then
    az appservice plan create \
        --name "$APP_SERVICE_PLAN" \
        --resource-group "$RESOURCE_GROUP" \
        --sku B1 \
        --is-linux \
        --output table
    echo "✅ App Service Plan created successfully"
else
    echo "ℹ️  App Service Plan already exists"
fi

echo ""

# Create Backend Web App
echo "🔧 Creating Backend Web App..."
if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP_NAME" &> /dev/null; then
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --plan "$APP_SERVICE_PLAN" \
        --name "$BACKEND_APP_NAME" \
        --runtime "NODE:18-lts" \
        --output table
    echo "✅ Backend Web App created successfully"
else
    echo "ℹ️  Backend Web App already exists"
fi

echo ""

# Create Frontend Web App
echo "🎨 Creating Frontend Web App..."
if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$FRONTEND_APP_NAME" &> /dev/null; then
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --plan "$APP_SERVICE_PLAN" \
        --name "$FRONTEND_APP_NAME" \
        --runtime "NODE:18-lts" \
        --output table
    echo "✅ Frontend Web App created successfully"
else
    echo "ℹ️  Frontend Web App already exists"
fi

echo ""
echo "🔐 Setting up Authentication Configuration..."
echo "==============================================="

# Prompt for API keys (optional - can be set later)
echo "You can configure API keys now or set them later in Azure Portal."
echo ""

read -p "🗝️  Enter Google Maps API Key (or press Enter to skip): " GOOGLE_MAPS_KEY
read -p "🤖 Enter OpenAI API Key (or press Enter to skip): " OPENAI_KEY
read -p "🔑 Enter JWT Secret (or press Enter to use default): " JWT_SECRET
read -p "👤 Enter Admin Username (or press Enter for 'admin'): " ADMIN_USER
read -p "🔒 Enter Admin Password (or press Enter for default): " ADMIN_PASS

# Set defaults
JWT_SECRET=${JWT_SECRET:-"ADMaps2024-Super-Secret-JWT-Key-Change-In-Production"}
ADMIN_USER=${ADMIN_USER:-"admin"}
ADMIN_PASS=${ADMIN_PASS:-"XXXX"}

echo ""
echo "⚙️  Configuring Backend App Settings..."

# Configure backend app settings
BACKEND_SETTINGS=(
    "NODE_ENV=production"
    "WEBSITE_NODE_DEFAULT_VERSION=~18"
    "SCM_DO_BUILD_DURING_DEPLOYMENT=true"
    "JWT_SECRET=$JWT_SECRET"
    "ADMIN_USERNAME=$ADMIN_USER"
    "ADMIN_PASSWORD=$ADMIN_PASS"
)

if [ ! -z "$GOOGLE_MAPS_KEY" ]; then
    BACKEND_SETTINGS+=("GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_KEY")
fi

if [ ! -z "$OPENAI_KEY" ]; then
    BACKEND_SETTINGS+=("OPENAI_API_KEY=$OPENAI_KEY")
fi

az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP_NAME" \
    --settings "${BACKEND_SETTINGS[@]}" \
    --output table

echo ""
echo "🚀 Starting Backend Deployment..."
echo "=================================="

# Deploy backend
if [ -f "scripts/deploy-backend.sh" ]; then
    chmod +x scripts/deploy-backend.sh
    ./scripts/deploy-backend.sh
else
    echo "⚠️  Backend deployment script not found, skipping..."
fi

echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 30

echo ""
echo "🎨 Starting Frontend Deployment..."
echo "==================================="

# Deploy frontend
if [ -f "scripts/deploy-frontend.sh" ]; then
    chmod +x scripts/deploy-frontend.sh
    ./scripts/deploy-frontend.sh
else
    echo "⚠️  Frontend deployment script not found, skipping..."
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "======================================"

BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
FRONTEND_URL="https://$FRONTEND_APP_NAME.azurewebsites.net"

echo ""
echo "📱 Application URLs:"
echo "   🎨 Frontend: $FRONTEND_URL"
echo "   🔧 Backend:  $BACKEND_URL"
echo ""
echo "🔐 Login Credentials:"
echo "   👤 Username: $ADMIN_USER"
echo "   🔒 Password: $ADMIN_PASS"
echo ""
echo "⚙️  Azure Resources Created:"
echo "   📁 Resource Group: $RESOURCE_GROUP"
echo "   🏗️  App Service Plan: $APP_SERVICE_PLAN (B1)"
echo "   🔧 Backend App: $BACKEND_APP_NAME"
echo "   🎨 Frontend App: $FRONTEND_APP_NAME"
echo ""
echo "📝 Next Steps:"
echo "   1. Visit $FRONTEND_URL"
echo "   2. Login with the credentials above"
echo "   3. Test all features (search, routing, maps)"
echo "   4. Configure custom domain (optional)"
echo "   5. Set up monitoring and alerts"
echo ""

if [ -z "$GOOGLE_MAPS_KEY" ] || [ -z "$OPENAI_KEY" ]; then
    echo "⚠️  Missing API Keys:"
    [ -z "$GOOGLE_MAPS_KEY" ] && echo "   - Google Maps API Key required for maps functionality"
    [ -z "$OPENAI_KEY" ] && echo "   - OpenAI API Key required for intelligent route planning"
    echo ""
    echo "   Configure these in Azure Portal > App Service > Configuration > Application Settings"
    echo "   Backend URL: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$BACKEND_APP_NAME/configuration"
fi

echo ""
echo "💰 Estimated Monthly Cost: ~\$13-15 USD (B1 App Service Plan)"
echo ""
echo "🆘 Troubleshooting:"
echo "   - Check logs: az webapp log tail --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo "   - Azure Portal: https://portal.azure.com"
echo "   - App Service Editor: $BACKEND_URL/dev"
echo ""
echo "✨ Deployment completed successfully! Enjoy your ADMaps application! 🗺️" 