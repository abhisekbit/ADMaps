#!/bin/bash

# ADMaps Frontend Deployment Script for Azure Web App
# This script builds and deploys the React frontend to Azure Web App

set -e  # Exit on any error

echo "🚀 Starting ADMaps Frontend Deployment to Azure..."

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
FRONTEND_APP_NAME="admaps-frontend-app"
BACKEND_APP_NAME="admaps-backend-api"
FRONTEND_DIR="frontend"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Frontend App: $FRONTEND_APP_NAME"
echo "   Backend App: $BACKEND_APP_NAME"
echo ""

# Navigate to frontend directory
cd "$FRONTEND_DIR" || { echo "❌ Frontend directory not found"; exit 1; }

echo "📦 Building frontend for production..."

# Install dependencies
echo "   Installing dependencies..."
npm ci

# Set backend URL for production build
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo "   Backend URL: $BACKEND_URL"

# Create production environment file for build
cat > .env.production << EOF
VITE_BACKEND_URL=$BACKEND_URL
VITE_GOOGLE_MAPS_API_KEY=\${VITE_GOOGLE_MAPS_API_KEY}
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
zip -r ../../frontend-deploy.zip . -x "*.map"

# Go back to project root
cd ../..

echo "☁️  Deploying to Azure Web App..."

# Deploy to Azure
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP_NAME" \
    --src frontend-deploy.zip

# Clean up deployment package
rm frontend-deploy.zip

echo "⚙️  Configuring app settings..."

# Set frontend app settings
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP_NAME" \
    --settings \
        NODE_ENV="production" \
        WEBSITE_NODE_DEFAULT_VERSION="~18" \
        VITE_BACKEND_URL="$BACKEND_URL"

# Configure SPA routing (for React Router)
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
  </system.webServer>
</configuration>
EOF

# Deploy web.config
az webapp deployment source config \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP_NAME" \
    --repo-url "local" \
    --branch "master" \
    --manual-integration

echo "🔍 Checking deployment status..."

# Wait a moment for deployment to process
sleep 15

# Check if the app is running
FRONTEND_URL="https://$FRONTEND_APP_NAME.azurewebsites.net"
echo "   Testing frontend: $FRONTEND_URL"

# Clean up local files
rm -f web.config
rm -f "$FRONTEND_DIR/.env.production"

if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend deployment successful!"
    echo "🌐 Frontend URL: $FRONTEND_URL"
    echo "🔗 Backend URL: $BACKEND_URL"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Visit $FRONTEND_URL"
    echo "   2. Login with configured credentials"
    echo "   3. Test all features (search, directions, routing)"
    echo ""
    echo "🔐 Default Login Credentials:"
    echo "   Username: admin"
    echo "   Password: XXXXXXXXX"
    echo ""
    echo "⚠️  Remember to:"
    echo "   - Configure Google Maps API key in backend app settings"
    echo "   - Set up custom domain (optional)"
    echo "   - Enable HTTPS redirect"
    echo "   - Monitor app logs for any issues"
else
    echo "⚠️  Frontend deployment completed but accessibility check failed."
    echo "   URL: $FRONTEND_URL"
    echo "   This might be normal for initial deployment - check Azure portal."
fi

echo ""
echo "🎯 Frontend deployment process completed!" 