#!/bin/bash

# Development Environment Setup Script for evmgateway
# This script automates the setup process for local development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        log_success "Node.js found: v$NODE_VERSION"
        
        # Check if Node version is >= 18
        if [[ $(echo "$NODE_VERSION" | cut -d. -f1) -lt 18 ]]; then
            log_error "Node.js version 18+ required, found v$NODE_VERSION"
            exit 1
        fi
    else
        log_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        log_success "Git found: v$GIT_VERSION"
    else
        log_error "Git not found. Please install Git first."
        exit 1
    fi
    
    log_success "Prerequisites check passed!"
}

# Install Bun if not present
install_bun() {
    if command_exists bun; then
        BUN_VERSION=$(bun --version)
        log_success "Bun already installed: v$BUN_VERSION"
        return 0
    fi
    
    log_info "Installing Bun package manager..."
    
    if command_exists curl; then
        curl -fsSL https://bun.sh/install | bash
        
        # Add to current PATH
        export PATH="$HOME/.bun/bin:$PATH"
        
        # Verify installation
        if command_exists bun; then
            BUN_VERSION=$(bun --version)
            log_success "Bun installed successfully: v$BUN_VERSION"
        else
            log_error "Bun installation failed. Please install manually."
            exit 1
        fi
    else
        log_error "curl not found. Please install curl or Bun manually."
        exit 1
    fi
}

# Build core evm-gateway package
build_core_package() {
    log_info "Building core evm-gateway package..."
    
    if bun run workspace evm-gateway build; then
        log_success "Core package built successfully"
    else
        log_error "Failed to build core package"
        exit 1
    fi
}

# Install dependencies with retry logic
install_dependencies() {
    log_info "Installing project dependencies..."
    
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if bun install; then
            log_success "Dependencies installed successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            
            if [ $retry_count -lt $max_retries ]; then
                log_warning "Installation failed, trying alternative registry (attempt $retry_count/$max_retries)"
                sleep 2
                
                # Try with npm registry on retry
                if bun install --registry https://registry.npmjs.org/; then
                    log_success "Dependencies installed with npm registry"
                    return 0
                fi
            fi
        fi
    done
    
    log_error "Failed to install dependencies after $max_retries attempts"
    log_info "You may need to:"
    log_info "  1. Check your internet connection"
    log_info "  2. Set up GitHub authentication: export GITHUB_TOKEN=your_token"
    log_info "  3. Configure proxy settings if behind corporate firewall"
    exit 1
}

# Build all packages
build_packages() {
    log_info "Building all packages..."
    
    if bun run build; then
        log_success "All packages built successfully"
    else
        log_warning "Some packages failed to build, but continuing..."
        log_info "You can build individual packages later with: bun run workspace <package> build"
    fi
}

# Create environment file from template
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env file from template"
            log_info "Please edit .env file with your configuration"
        else
            # Create basic .env template
            cat > .env << 'EOF'
# Environment Configuration for evmgateway development

# Development mode
NODE_ENV=development

# RPC endpoints (replace with your API keys)
L1_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY
L2_OPTIMISM_RPC_URL=https://mainnet.optimism.io
L2_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
L2_SCROLL_RPC_URL=https://rpc.scroll.io

# Debug logging
DEBUG=evmgateway:*

# Optional: Increase memory for Node.js
NODE_OPTIONS="--max-old-space-size=4096"
EOF
            log_success "Created basic .env file"
            log_info "Please edit .env file with your RPC endpoints"
        fi
    else
        log_info ".env file already exists, skipping"
    fi
}

# Setup git hooks
setup_git_hooks() {
    log_info "Setting up git hooks..."
    
    if [ -d ".git" ]; then
        # Husky should install hooks automatically, but let's ensure it
        if command_exists bun && [ -f "package.json" ]; then
            if grep -q "husky" package.json; then
                bun run prepare 2>/dev/null || true
                log_success "Git hooks configured"
            fi
        fi
    else
        log_warning "Not a git repository, skipping git hooks"
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying development setup..."
    
    local errors=0
    
    # Check if core builds exist
    if [ -d "evm-gateway/_cjs" ] && [ -d "evm-gateway/_esm" ] && [ -d "evm-gateway/_types" ]; then
        log_success "Core package builds found"
    else
        log_error "Core package builds missing"
        errors=$((errors + 1))
    fi
    
    # Check if linting works
    if bun run workspace evm-gateway lint >/dev/null 2>&1; then
        log_success "Linting works"
    else
        log_warning "Linting may have issues"
    fi
    
    # Check environment file
    if [ -f ".env" ]; then
        log_success "Environment file exists"
    else
        log_warning "No environment file found"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Setup verification passed!"
        return 0
    else
        log_error "Setup verification found $errors issue(s)"
        return 1
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env file with your RPC endpoints"
    echo "  2. Open the project in your IDE (VS Code recommended)"
    echo "  3. Try running tests: bun run test"
    echo "  4. Start developing! See DEVELOPMENT.md for more details"
    echo ""
    echo "Common commands:"
    echo "  bun run build                    - Build all packages"
    echo "  bun run test                     - Run tests"
    echo "  bun run lint                     - Lint code"
    echo "  bun run workspace <pkg> <cmd>    - Run command in specific package"
    echo ""
    echo "For help, see:"
    echo "  - DEVELOPMENT.md for detailed documentation"
    echo "  - README.md for project overview"
    echo "  - https://github.com/ensdomains/evmgateway/issues for issues"
    echo ""
}

# Main setup function
main() {
    echo "🚀 Setting up evmgateway development environment..."
    echo ""
    
    # Change to script directory
    cd "$(dirname "$0")/.." || exit 1
    
    # Run setup steps
    check_prerequisites
    install_bun
    build_core_package
    install_dependencies
    build_packages
    setup_environment
    setup_git_hooks
    
    if verify_setup; then
        show_next_steps
    else
        echo ""
        log_warning "Setup completed with some issues. Check the logs above."
        log_info "You can continue development, but some features may not work properly."
        show_next_steps
    fi
}

# Run main function
main "$@"