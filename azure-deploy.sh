#!/bin/bash

# Azure Deployment Script for PitStopPal
# This script builds Docker images locally and deploys to Azure Web Apps
# 
# IMPROVEMENTS:
# - Uses timestamped Docker image tags to force fresh deployments
# - Forces Azure Web App restart to ensure new container is picked up
# - Verifies deployment by checking JavaScript file references
# - Prevents caching issues that could serve old JavaScript files

set -e

# Configuration
RESOURCE_GROUP="rg-pitstoppal-1"
BACKEND_WEBAPP_NAME="pitstoppal-webapp"
FRONTEND_WEBAPP_NAME="pitstoppal-webapp"
LOCATION="eastus2"
ACR_NAME="pitstoppalacr"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    
    if ! command_exists az; then
        print_error "Azure CLI is not installed. Please install Azure CLI."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Login to Azure
login_to_azure() {
    print_status "Logging into Azure..."
    az login --output none
    if [ $? -eq 0 ]; then
        print_success "Successfully logged into Azure"
    else
        print_error "Failed to login to Azure"
        exit 1
    fi
}

# Set Azure subscription
set_subscription() {
    print_status "Setting Azure subscription..."
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    az account set --subscription $SUBSCRIPTION_ID
    print_success "Using subscription: $SUBSCRIPTION_ID"
}

# Create or get Azure Container Registry
setup_acr() {
    print_status "Setting up Azure Container Registry..."
    
    # Check if ACR exists
    if az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --output none 2>/dev/null; then
        print_success "ACR $ACR_NAME already exists"
    else
        print_status "Creating ACR $ACR_NAME..."
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $ACR_NAME \
            --sku Basic \
            --admin-enabled true
        print_success "ACR $ACR_NAME created"
    fi
    
    # Get ACR login server
    ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer -o tsv)
    print_success "ACR Login Server: $ACR_LOGIN_SERVER"
    
    # Login to ACR
    print_status "Logging into ACR..."
    az acr login --name $ACR_NAME
}

# Build and push backend image
build_backend() {
    print_status "Building backend Docker image..."
    
    # Build frontend first
    print_status "Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
    
    # Copy frontend build to backend
    print_status "Copying frontend build to backend..."
    mkdir -p backend/public
    cp -r frontend/dist/* backend/public/
    
    cd backend
    
    # Generate timestamped tag to force fresh deployment
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    IMAGE_TAG="pitstoppal-backend:$TIMESTAMP"
    
    # Build image with timestamped tag
    print_status "Building Docker image with tag: $IMAGE_TAG"
    docker build --platform=linux/amd64 -t $ACR_LOGIN_SERVER/$IMAGE_TAG .
    
    # Also tag as latest for consistency
    docker tag $ACR_LOGIN_SERVER/$IMAGE_TAG $ACR_LOGIN_SERVER/pitstoppal-backend:latest
    
    # Push both tags to ACR
    print_status "Pushing backend images to ACR..."
    docker push $ACR_LOGIN_SERVER/$IMAGE_TAG
    docker push $ACR_LOGIN_SERVER/pitstoppal-backend:latest
    
    # Store the timestamped tag for deployment
    echo "$IMAGE_TAG" > .deployment_tag
    
    cd ..
    print_success "Backend image built and pushed successfully"
}

# Deploy backend to Azure Web App
deploy_backend() {
    print_status "Deploying backend to Azure Web App..."
    
    # Get the timestamped tag from the build
    if [ -f "backend/.deployment_tag" ]; then
        DEPLOYMENT_TAG=$(cat backend/.deployment_tag)
        print_status "Using deployment tag: $DEPLOYMENT_TAG"
    else
        print_warning "No deployment tag found, using latest"
        DEPLOYMENT_TAG="pitstoppal-backend:latest"
    fi
    
    # Get ACR credentials
    ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
    
    # Configure Web App for container deployment with timestamped tag
    print_status "Updating Azure Web App with new container image..."
    az webapp config container set \
        --resource-group $RESOURCE_GROUP \
        --name $BACKEND_WEBAPP_NAME \
        --docker-custom-image-name $ACR_LOGIN_SERVER/$DEPLOYMENT_TAG \
        --docker-registry-server-url https://$ACR_LOGIN_SERVER \
        --docker-registry-server-user $ACR_USERNAME \
        --docker-registry-server-password $ACR_PASSWORD
    
    # Set environment variables (these should be configured in Azure App Configuration)
    az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP \
        --name $BACKEND_WEBAPP_NAME \
        --settings \
        WEBSITES_PORT=8080 \
        NODE_ENV=production \
        PORT=8080
    
    # Force restart to ensure new container is picked up
    print_status "Restarting Azure Web App to apply changes..."
    az webapp restart --resource-group $RESOURCE_GROUP --name $BACKEND_WEBAPP_NAME
    
    # Wait for restart to complete
    print_status "Waiting for restart to complete..."
    sleep 30
    
    # Verify the correct JavaScript file is being served
    print_status "Verifying deployment..."
    BACKEND_URL=$(az webapp show --resource-group $RESOURCE_GROUP --name $BACKEND_WEBAPP_NAME --query defaultHostName -o tsv)
    JS_FILE=$(curl -s "https://$BACKEND_URL" | grep -o 'index-[^.]*\.js' | head -1)
    
    if [ -n "$JS_FILE" ]; then
        print_success "Deployment verified - serving JavaScript file: $JS_FILE"
    else
        print_warning "Could not verify JavaScript file reference"
    fi
    
    print_success "Backend deployed successfully"
}

# Test local Docker images
test_local() {
    print_status "Testing Docker images locally..."
    
    # Test backend
    print_status "Testing backend image..."
    docker run -d --name test-backend -p 4001:8080 $ACR_LOGIN_SERVER/pitstoppal-backend:latest
    sleep 5
    
    if curl -f http://localhost:4001/health >/dev/null 2>&1; then
        print_success "Backend test passed"
    else
        print_error "Backend test failed"
    fi
    
    docker stop test-backend
    docker rm test-backend
}

# Cleanup temporary files
cleanup() {
    print_status "Cleaning up temporary files..."
    if [ -f "backend/.deployment_tag" ]; then
        rm backend/.deployment_tag
        print_success "Cleaned up deployment tag file"
    fi
}

# Get deployment URLs
get_urls() {
    print_status "Getting deployment URLs..."
    
    BACKEND_URL=$(az webapp show --resource-group $RESOURCE_GROUP --name $BACKEND_WEBAPP_NAME --query defaultHostName -o tsv)
    
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    echo "Application URL: https://$BACKEND_URL"
    echo "Note: This is a single Web App deployment serving both frontend and backend"
    echo ""
    echo "Remember to configure environment variables in Azure App Configuration:"
    echo "- OPENAI_API_KEY"
    echo "- GOOGLE_MAPS_API_KEY"
    echo "- JWT_SECRET"
    echo "- ADMIN_USERNAME"
    echo "- ADMIN_PASSWORD"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "PitStopPal Azure Deployment Script"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    login_to_azure
    set_subscription
    setup_acr
    build_backend
    
    if [ "$1" = "--test-local" ]; then
        test_local
    fi
    
    deploy_backend
    cleanup
    get_urls
    
    print_success "Deployment completed!"
}

# Run main function with all arguments
main "$@" 