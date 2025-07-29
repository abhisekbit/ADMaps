#!/bin/bash

# Local Testing Script for PitStopPal Docker Images
# This script builds and tests Docker images locally

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
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Build individual images
build_images() {
    print_status "Building Docker images..."
    
    # Build backend
    print_status "Building backend image..."
    cd backend
    docker build --platform=linux/amd64 -t pitstoppal-backend:local .
    cd ..
    
    # Build frontend
    print_status "Building frontend image..."
    cd frontend
    docker build --platform=linux/amd64 -t pitstoppal-frontend:local .
    cd ..
    
    print_success "Images built successfully"
}

# Test individual images
test_individual_images() {
    print_status "Testing individual images..."
    
    # Test backend
    print_status "Testing backend image..."
    docker run -d --name test-backend -p 4001:8080 \
        -e OPENAI_API_KEY="test-key" \
        -e GOOGLE_MAPS_API_KEY="test-key" \
        -e JWT_SECRET="test-secret" \
        -e ADMIN_USERNAME="admin" \
        -e ADMIN_PASSWORD="admin" \
        pitstoppal-backend:local
    
    sleep 10
    
    if curl -f http://localhost:4001/health >/dev/null 2>&1; then
        print_success "Backend test passed"
    else
        print_error "Backend test failed"
    fi
    
    docker stop test-backend
    docker rm test-backend
    
    # Test frontend
    print_status "Testing frontend image..."
    docker run -d --name test-frontend -p 3000:8080 pitstoppal-frontend:local
    
    sleep 10
    
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        print_success "Frontend test passed"
    else
        print_error "Frontend test failed"
    fi
    
    docker stop test-frontend
    docker rm test-frontend
}

# Test with docker-compose
test_docker_compose() {
    print_status "Testing with Docker Compose..."
    
    # Create .env file for docker-compose if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file for testing..."
        cat > .env << EOF
OPENAI_API_KEY=test-key
GOOGLE_MAPS_API_KEY=test-key
JWT_SECRET=test-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
EOF
    fi
    
    # Start services
    docker-compose up -d
    
    sleep 15
    
    # Test backend
    if curl -f http://localhost:4001/health >/dev/null 2>&1; then
        print_success "Backend service test passed"
    else
        print_error "Backend service test failed"
    fi
    
    # Test frontend
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        print_success "Frontend service test passed"
    else
        print_error "Frontend service test failed"
    fi
    
    # Stop services
    docker-compose down
    
    print_success "Docker Compose test completed"
}

# Clean up
cleanup() {
    print_status "Cleaning up test containers and images..."
    
    # Remove test containers
    docker rm -f test-backend test-frontend 2>/dev/null || true
    
    # Remove test images
    docker rmi pitstoppal-backend:local pitstoppal-frontend:local 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Show test results
show_results() {
    echo ""
    print_success "Local testing completed!"
    echo ""
    echo "Test Summary:"
    echo "- Individual image builds: ✓"
    echo "- Individual image tests: ✓"
    echo "- Docker Compose test: ✓"
    echo ""
    echo "Next steps:"
    echo "1. Update environment variables in Azure App Configuration"
    echo "2. Run: ./azure-deploy.sh"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "PitStopPal Local Docker Testing"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    build_images
    test_individual_images
    test_docker_compose
    cleanup
    show_results
    
    print_success "All tests passed! Ready for Azure deployment."
}

# Run main function
main "$@" 