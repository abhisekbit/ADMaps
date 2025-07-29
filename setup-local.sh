#!/bin/bash

# Local Development Setup Script for PitStopPal
# This script sets up the local development environment

set -e

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

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        print_status "Creating .env file from template..."
        cp env.local.example .env
        print_success ".env file created"
        print_warning "Please edit .env file with your actual API keys and secrets"
        echo ""
        echo "Required environment variables:"
        echo "  - OPENAI_API_KEY: Your OpenAI API key"
        echo "  - GOOGLE_MAPS_API_KEY: Your Google Maps API key"
        echo "  - JWT_SECRET: A secret string for JWT tokens"
        echo "  - ADMIN_USERNAME: Admin login username (default: admin)"
        echo "  - ADMIN_PASSWORD: Admin login password"
        echo ""
        echo "You can get API keys from:"
        echo "  - OpenAI: https://platform.openai.com/api-keys"
        echo "  - Google Maps: https://console.cloud.google.com/apis/credentials"
        echo ""
        return 1
    else
        print_success ".env file found"
        return 0
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_success "Dependencies installed"
}

# Test local setup
test_local_setup() {
    print_status "Testing local setup..."
    
    # Check if required environment variables are set
    source .env
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        print_warning "OPENAI_API_KEY not set or using default value"
    fi
    
    if [ -z "$GOOGLE_MAPS_API_KEY" ] || [ "$GOOGLE_MAPS_API_KEY" = "your_google_maps_api_key_here" ]; then
        print_warning "GOOGLE_MAPS_API_KEY not set or using default value"
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_jwt_secret_here" ]; then
        print_warning "JWT_SECRET not set or using default value"
    fi
    
    if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "your_admin_password_here" ]; then
        print_warning "ADMIN_PASSWORD not set or using default value"
    fi
    
    print_success "Local setup test completed"
}

# Show usage instructions
show_instructions() {
    echo ""
    print_success "Local development setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your actual API keys and secrets"
    echo "2. Start the application:"
    echo "   - With Docker Compose: docker-compose up"
    echo "   - Or test Docker images: ./test-local.sh"
    echo ""
    echo "Local URLs:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend: http://localhost:4001"
    echo ""
    echo "Default login:"
    echo "  - Username: admin"
    echo "  - Password: (set in .env file)"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "PitStopPal Local Development Setup"
    echo "=========================================="
    echo ""
    
    check_env_file
    install_dependencies
    test_local_setup
    show_instructions
    
    print_success "Setup completed!"
}

# Run main function
main "$@" 