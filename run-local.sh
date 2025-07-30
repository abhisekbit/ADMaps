#!/bin/bash

# Local Development Script for PitStopPal (No Docker)
# This script runs the frontend and backend locally without Docker

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js."
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
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

# Start backend server
start_backend() {
    print_status "Starting backend server..."
    cd backend
    
    # Load environment variables
    if [ -f ../.env ]; then
        export $(cat ../.env | grep -v '^#' | xargs)
    fi
    
    # Start backend server
    npm start &
    BACKEND_PID=$!
    cd ..
    
    print_success "Backend server started (PID: $BACKEND_PID)"
    echo $BACKEND_PID > .backend.pid
}

# Start frontend server
start_frontend() {
    print_status "Starting frontend server..."
    cd frontend
    
    # Start frontend development server
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Frontend server started (PID: $FRONTEND_PID)"
    echo $FRONTEND_PID > .frontend.pid
}

# Wait for servers to be ready
wait_for_servers() {
    print_status "Waiting for servers to be ready..."
    
    # Wait for backend
    print_status "Waiting for backend server..."
    for i in {1..30}; do
        if curl -f http://localhost:4001/health >/dev/null 2>&1; then
            print_success "Backend server is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Backend server failed to start"
            exit 1
        fi
        sleep 1
    done
    
    # Wait for frontend
    print_status "Waiting for frontend server..."
    for i in {1..30}; do
        if curl -f http://localhost:5173 >/dev/null 2>&1; then
            print_success "Frontend server is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Frontend server failed to start"
            exit 1
        fi
        sleep 1
    done
}

# Show URLs
show_urls() {
    echo ""
    print_success "Application is running!"
    echo ""
    echo "Local URLs:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend: http://localhost:4001"
    echo ""
    echo "Default login:"
    echo "  - Username: admin"
    echo "  - Password: (set in .env file)"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo ""
}

# Cleanup function
cleanup() {
    print_status "Stopping servers..."
    
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm .backend.pid
        print_success "Backend server stopped"
    fi
    
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm .frontend.pid
        print_success "Frontend server stopped"
    fi
    
    print_success "All servers stopped"
}

# Trap Ctrl+C to cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "=========================================="
    echo "PitStopPal Local Development (No Docker)"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    check_env_file
    install_dependencies
    start_backend
    start_frontend
    wait_for_servers
    show_urls
    
    # Keep script running
    print_status "Servers are running. Press Ctrl+C to stop..."
    while true; do
        sleep 1
    done
}

# Run main function
main "$@" 