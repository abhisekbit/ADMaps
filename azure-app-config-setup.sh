#!/bin/bash

# Azure App Configuration Setup Script for PitStopPal
# This script creates and configures Azure App Configuration for environment variables

set -e

# Configuration
RESOURCE_GROUP="rg-pitstoppal-1"
APP_CONFIG_NAME="pitstoppal-config"
LOCATION="eastus2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create Azure App Configuration
create_app_config() {
    print_status "Creating Azure App Configuration..."
    
    # Check if App Configuration exists
    if az appconfig show --name $APP_CONFIG_NAME --resource-group $RESOURCE_GROUP --output none 2>/dev/null; then
        print_success "App Configuration $APP_CONFIG_NAME already exists"
    else
        print_status "Creating App Configuration $APP_CONFIG_NAME..."
        az appconfig create \
            --resource-group $RESOURCE_GROUP \
            --name $APP_CONFIG_NAME \
            --location $LOCATION \
            --sku Standard
        print_success "App Configuration $APP_CONFIG_NAME created"
    fi
}

# Add configuration values
add_config_values() {
    print_status "Adding configuration values..."
    
    # Backend configuration values
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Backend:OPENAI_API_KEY" \
        --value "YOUR_OPENAI_API_KEY_HERE" \
        --yes
    
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Backend:GOOGLE_MAPS_API_KEY" \
        --value "YOUR_GOOGLE_MAPS_API_KEY_HERE" \
        --yes
    
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Backend:JWT_SECRET" \
        --value "YOUR_JWT_SECRET_HERE" \
        --yes
    
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Backend:ADMIN_USERNAME" \
        --value "admin" \
        --yes
    
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Backend:ADMIN_PASSWORD" \
        --value "YOUR_ADMIN_PASSWORD_HERE" \
        --yes
    
    # Frontend configuration values
    az appconfig kv set \
        --name $APP_CONFIG_NAME \
        --key "Frontend:REACT_APP_API_URL" \
        --value "https://pitstoppal-webapp-ckcqehfyd4b2aqfj.eastus2-01.azurewebsites.net" \
        --yes
    
    print_success "Configuration values added"
}

# Configure Web Apps to use App Configuration
configure_webapps() {
    print_status "Configuring Web Apps to use App Configuration..."
    
    # Get App Configuration connection string
    APP_CONFIG_CONNECTION_STRING=$(az appconfig credential list --name $APP_CONFIG_NAME --query connectionStrings[0].connectionString -o tsv)
    
    # Configure Web App
    az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP \
        --name "pitstoppal-webapp" \
        --settings \
        AZURE_APP_CONFIG_CONNECTION_STRING="$APP_CONFIG_CONNECTION_STRING" \
        WEBSITES_PORT=8080 \
        NODE_ENV=production \
        PORT=8080
    
    print_success "Web Apps configured to use App Configuration"
}

# Update backend to use App Configuration
update_backend_config() {
    print_status "Updating backend to use Azure App Configuration..."
    
    # Create a temporary file for the updated backend code
    cat > backend/config.js << 'EOF'
const { DefaultAzureCredential } = require('@azure/identity');
const { AppConfigurationClient } = require('@azure/app-configuration');

let configCache = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getConfig() {
    const now = Date.now();
    
    // Return cached config if still valid
    if (now - lastFetch < CACHE_DURATION && Object.keys(configCache).length > 0) {
        return configCache;
    }
    
    try {
        const connectionString = process.env.AZURE_APP_CONFIG_CONNECTION_STRING;
        if (!connectionString) {
            console.warn('AZURE_APP_CONFIG_CONNECTION_STRING not set, using environment variables');
            return {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
                JWT_SECRET: process.env.JWT_SECRET,
                ADMIN_USERNAME: process.env.ADMIN_USERNAME,
                ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
            };
        }
        
        const client = new AppConfigurationClient(connectionString);
        const settings = client.listConfigurationSettings({
            keyFilter: "Backend:*"
        });
        
        const newConfig = {};
        for await (const setting of settings) {
            const key = setting.key.replace('Backend:', '');
            newConfig[key] = setting.value;
        }
        
        configCache = newConfig;
        lastFetch = now;
        
        console.log('Configuration loaded from Azure App Configuration');
        return newConfig;
    } catch (error) {
        console.error('Error loading configuration from Azure App Configuration:', error);
        console.log('Falling back to environment variables');
        
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
            JWT_SECRET: process.env.JWT_SECRET,
            ADMIN_USERNAME: process.env.ADMIN_USERNAME,
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
        };
    }
}

module.exports = { getConfig };
EOF

    print_success "Backend configuration updated"
}

# Update backend package.json to include Azure dependencies
update_backend_dependencies() {
    print_status "Updating backend dependencies..."
    
    # Add Azure dependencies to package.json
    cd backend
    
    # Check if @azure/identity and @azure/app-configuration are already in dependencies
    if ! grep -q "@azure/identity" package.json; then
        npm install @azure/identity @azure/app-configuration
    fi
    
    cd ..
    
    print_success "Backend dependencies updated"
}

# Show configuration instructions
show_instructions() {
    echo ""
    print_success "Azure App Configuration setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update the configuration values in Azure App Configuration:"
    echo "   - Go to Azure Portal > App Configuration > $APP_CONFIG_NAME"
    echo "   - Update the following keys with your actual values:"
    echo "     * Backend:OPENAI_API_KEY"
    echo "     * Backend:GOOGLE_MAPS_API_KEY"
    echo "     * Backend:JWT_SECRET"
    echo "     * Backend:ADMIN_PASSWORD"
    echo ""
    echo "2. Update the backend code to use the new configuration:"
    echo "   - The config.js file has been created in the backend directory"
    echo "   - Update index.js to use the new configuration system"
    echo ""
    echo "3. Redeploy the applications:"
    echo "   - Run: ./azure-deploy.sh"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "Azure App Configuration Setup for PitStopPal"
    echo "=========================================="
    echo ""
    
    create_app_config
    add_config_values
    configure_webapps
    update_backend_config
    update_backend_dependencies
    show_instructions
    
    print_success "Setup completed!"
}

# Run main function
main "$@" 