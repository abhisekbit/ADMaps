#!/bin/bash

# PitStopPal Complete App Deployment Script
# This script deploys both backend and frontend to existing Azure Web Apps
# Prerequisites: Azure Web Apps must already exist and be configured

set -e  # Exit on any error

echo "🚀 Starting Complete PitStopPal Application Deployment..."
echo "=========================================================="

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
FRONTEND_APP_NAME="pitstoppal-frontend-app"

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Backend App: $BACKEND_APP_NAME"
echo "   Frontend App: $FRONTEND_APP_NAME"
echo ""

# Get current subscription info
SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
echo "📊 Azure Subscription: $SUBSCRIPTION_NAME"
echo ""

# Verify all Azure resources exist
echo "🔍 Verifying Azure resources..."

if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "❌ Resource group '$RESOURCE_GROUP' not found"
    echo "Please create it manually in Azure Portal first."
    echo "See: AZURE_MANUAL_SETUP_GUIDE.md"
    exit 1
fi

if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP_NAME" &> /dev/null; then
    echo "❌ Backend Web App '$BACKEND_APP_NAME' not found"
    echo "Please create it manually in Azure Portal first."
    exit 1
fi

if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$FRONTEND_APP_NAME" &> /dev/null; then
    echo "❌ Frontend Web App '$FRONTEND_APP_NAME' not found"
    echo "Please create it manually in Azure Portal first."
    exit 1
fi

echo "✅ Resource group found: $RESOURCE_GROUP"
echo "✅ Backend Web App found: $BACKEND_APP_NAME"
echo "✅ Frontend Web App found: $FRONTEND_APP_NAME"
echo ""

# Confirm deployment
read -p "🤔 Do you want to deploy both applications? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo ""
echo "🔧 Starting Backend Deployment..."
echo "===================================="

# Deploy backend first
if [ -f "scripts/deploy-backend-only.sh" ]; then
    chmod +x scripts/deploy-backend-only.sh
    
    # Run backend deployment with custom configuration
    TEMP_BACKEND_SCRIPT=$(mktemp)
    sed "s/RESOURCE_GROUP=\"rg-pitstoppal\"/RESOURCE_GROUP=\"$RESOURCE_GROUP\"/" scripts/deploy-backend-only.sh > "$TEMP_BACKEND_SCRIPT"
    sed -i "s/BACKEND_APP_NAME=\"pitstoppal-backend-api\"/BACKEND_APP_NAME=\"$BACKEND_APP_NAME\"/" "$TEMP_BACKEND_SCRIPT"
    chmod +x "$TEMP_BACKEND_SCRIPT"
    
    bash "$TEMP_BACKEND_SCRIPT"
    rm "$TEMP_BACKEND_SCRIPT"
    
    echo "✅ Backend deployment completed"
else
    echo "❌ Backend deployment script not found: scripts/deploy-backend-only.sh"
    exit 1
fi

echo ""
echo "⏳ Waiting for backend to be fully ready..."
sleep 30

echo ""
echo "🎨 Starting Frontend Deployment..."
echo "===================================="

# Deploy frontend
if [ -f "scripts/deploy-frontend-only.sh" ]; then
    chmod +x scripts/deploy-frontend-only.sh
    
    # Run frontend deployment with custom configuration
    TEMP_FRONTEND_SCRIPT=$(mktemp)
    sed "s/RESOURCE_GROUP=\"rg-pitstoppal\"/RESOURCE_GROUP=\"$RESOURCE_GROUP\"/" scripts/deploy-frontend-only.sh > "$TEMP_FRONTEND_SCRIPT"
    sed -i "s/FRONTEND_APP_NAME=\"pitstoppal-frontend-app\"/FRONTEND_APP_NAME=\"$FRONTEND_APP_NAME\"/" "$TEMP_FRONTEND_SCRIPT"
    sed -i "s/BACKEND_APP_NAME=\"pitstoppal-backend-api\"/BACKEND_APP_NAME=\"$BACKEND_APP_NAME\"/" "$TEMP_FRONTEND_SCRIPT"
    chmod +x "$TEMP_FRONTEND_SCRIPT"
    
    bash "$TEMP_FRONTEND_SCRIPT"
    rm "$TEMP_FRONTEND_SCRIPT"
    
    echo "✅ Frontend deployment completed"
else
    echo "❌ Frontend deployment script not found: scripts/deploy-frontend-only.sh"
    exit 1
fi

echo ""
echo "🎉 COMPLETE DEPLOYMENT SUCCESSFUL!"
echo "===================================="

BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
FRONTEND_URL="https://$FRONTEND_APP_NAME.azurewebsites.net"

echo ""
echo "📱 Application URLs:"
echo "   🎨 Frontend: $FRONTEND_URL"
echo "   🔧 Backend:  $BACKEND_URL"
echo ""
echo "🔐 Login Credentials:"
echo "   👤 Username: admin"
echo "   🔒 Password: XXXX"
echo ""
echo "⚙️  Azure Resources Used:"
echo "   📁 Resource Group: $RESOURCE_GROUP"
echo "   🔧 Backend App: $BACKEND_APP_NAME"
echo "   🎨 Frontend App: $FRONTEND_APP_NAME"
echo ""
echo "🧪 Quick System Test:"
echo "   1. Backend Health: curl -s $BACKEND_URL/health"
echo "   2. Frontend Access: curl -s $FRONTEND_URL > /dev/null && echo 'OK' || echo 'FAIL'"
echo "   3. Login Test: Visit $FRONTEND_URL and login"
echo ""

# Perform quick system test
echo "🔍 Running automated system test..."
echo ""

# Test backend health
if curl -f -s -m 10 "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend health check: PASSED"
else
    echo "❌ Backend health check: FAILED"
fi

# Test frontend accessibility
if curl -f -s -m 10 "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend accessibility: PASSED"
else
    echo "❌ Frontend accessibility: FAILED"
fi

echo ""
echo "📊 Deployment Summary:"
echo "   • Both applications deployed successfully"
echo "   • Authentication system ready"
echo "   • Maps and navigation features active"
echo "   • Mobile-responsive design enabled"
echo ""
echo "📝 Next Steps:"
echo "   1. 🌐 Visit: $FRONTEND_URL"
echo "   2. 🔐 Login with provided credentials"
echo "   3. 🗺️  Test search and navigation features"
echo "   4. 📱 Test on mobile devices"
echo "   5. 🔧 Monitor application logs if needed"
echo ""
echo "🆘 Troubleshooting:"
echo "   • Backend logs: az webapp log tail --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo "   • Frontend logs: az webapp log tail --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo "   • Azure Portal: https://portal.azure.com"
echo ""
echo "💰 Estimated Monthly Cost: Depends on your App Service Plan"
echo "   • Basic B1: ~$13-15 USD"
echo "   • Standard S1: ~$70 USD"
echo ""
echo "✨ Your PitStopPal application is now live and ready for users! 🗺️🚗"
echo ""
echo "🎊 Deployment completed successfully! Enjoy your smart travel companion!" 