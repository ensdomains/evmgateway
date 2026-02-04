# Makefile for evmgateway development
# Provides convenient shortcuts for common development tasks

.PHONY: help setup install build test lint clean format check dev reset

# Default target
help: ## Show this help message
	@echo "evmgateway development commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup and installation
setup: ## Run complete development environment setup
	@./scripts/dev-setup.sh

install: ## Install dependencies 
	@echo "Installing dependencies..."
	@bun run workspace evm-gateway build
	@bun install

# Building
build: ## Build all packages
	@echo "Building all packages..."
	@bun run build:all

build-core: ## Build only the core evm-gateway package
	@echo "Building core evm-gateway package..."
	@bun run workspace evm-gateway build

# Testing
test: ## Run all tests
	@echo "Running tests..."
	@bun run test

test-watch: ## Run tests in watch mode
	@echo "Running tests in watch mode..."
	@bun run test:watch

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@bun run test:coverage

# Code quality  
lint: ## Lint all code
	@echo "Linting code..."
	@bun run lint

format: ## Format all code
	@echo "Formatting code..."
	@bun run format

check: lint test ## Run linting and tests
	@echo "Code quality check complete!"

# Development utilities
dev: ## Verify development setup
	@echo "Verifying development setup..."
	@bun run dev:verify

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	@bun run dev:clean

reset: ## Reset development environment (clean + reinstall)
	@echo "Resetting development environment..."
	@bun run dev:reset

# Package-specific commands
workspace: ## Run command in specific workspace (usage: make workspace PACKAGE=evm-gateway COMMAND=build)
	@if [ -z "$(PACKAGE)" ] || [ -z "$(COMMAND)" ]; then \
		echo "Usage: make workspace PACKAGE=<package-name> COMMAND=<command>"; \
		echo "Example: make workspace PACKAGE=evm-gateway COMMAND=build"; \
		exit 1; \
	fi
	@bun run workspace $(PACKAGE) $(COMMAND)

# Git utilities
hooks: ## Install git hooks
	@echo "Installing git hooks..."
	@bun run prepare

# Environment setup
env: ## Create .env file from template
	@if [ ! -f .env ]; then \
		echo "Creating .env file from template..."; \
		cp .env.example .env; \
		echo ".env file created. Please edit with your configuration."; \
	else \
		echo ".env file already exists."; \
	fi

# Documentation
docs: ## Generate documentation (if available)
	@echo "Generating documentation..."
	@echo "Documentation is available in README.md and DEVELOPMENT.md"

# Development server (if applicable)
server-l1: ## Start L1 gateway server
	@echo "Starting L1 gateway server..."
	@cd l1-gateway && bun run dev || bun run start

# Quick development cycle
dev-cycle: clean build lint test ## Full development cycle: clean, build, lint, test
	@echo "Development cycle complete!"

# Show environment info
info: ## Show development environment information
	@echo "Development Environment Information:"
	@echo "====================================="
	@echo "Node.js version: $$(node --version)"
	@echo "Bun version: $$(bun --version)"
	@echo "Git version: $$(git --version | cut -d' ' -f3)"
	@echo "Operating System: $$(uname -s)"
	@echo "Architecture: $$(uname -m)"
	@echo ""
	@echo "Project Structure:"
	@echo "- evm-gateway: Core gateway framework"
	@echo "- evm-verifier: Core verifier library"  
	@echo "- l1-gateway: L1 Ethereum gateway"
	@echo "- l1-verifier: L1 verifier with tests"
	@echo "- op-gateway: Optimism gateway"
	@echo "- op-verifier: Optimism verifier"
	@echo "- arb-gateway: Arbitrum gateway"
	@echo "- arb-verifier: Arbitrum verifier"
	@echo "- scroll-gateway: Scroll gateway"
	@echo "- scroll-verifier: Scroll verifier"