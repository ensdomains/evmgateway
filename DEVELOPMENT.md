# Development Environment Setup

This guide provides comprehensive instructions for setting up a local development environment for the evmgateway repository.

## Prerequisites

### Required Tools

- **Node.js**: v18+ (v20.19.4 recommended)
- **Bun**: v1.0+ (preferred package manager) 
- **Git**: Latest version
- **Text Editor**: VS Code recommended (see [IDE Setup](#ide-setup))

### System Requirements

- **Operating System**: Linux, macOS, or Windows (with WSL2 recommended)
- **Memory**: 4GB+ RAM recommended
- **Network**: Stable internet connection for downloading dependencies

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ensdomains/evmgateway.git
cd evmgateway

# 2. Run the automated setup script
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 3. Verify installation
bun run dev:verify
```

## Manual Setup

If the automated script doesn't work for your environment, follow these manual steps:

### 1. Install Bun (Package Manager)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (restart your terminal or run):
source ~/.bashrc  # Linux
source ~/.zshrc   # macOS with zsh

# Verify installation
bun --version
```

### 2. Install Dependencies

The project requires a specific build order due to internal package dependencies:

```bash
# Build the core evm-gateway package first
bun run workspace evm-gateway build

# Install all dependencies  
bun install

# If you encounter GitHub API rate limiting, try:
bun install --registry https://registry.npmjs.org/
```

### 3. Build All Packages

```bash
# Build all workspace packages
bun run build

# Or build individually if needed:
bun run workspace evm-gateway build
bun run workspace l1-gateway build
bun run workspace op-gateway build
# ... etc for other packages
```

### 4. Run Tests

```bash
# Run the test suite
bun run test

# Run tests for specific package
bun run workspace l1-verifier test
```

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build all packages |
| `bun run test` | Run all tests |
| `bun run lint` | Lint all packages |
| `bun run workspace <pkg> <script>` | Run script in specific package |
| `bun run dev:verify` | Verify development setup |
| `bun run dev:clean` | Clean all build artifacts |

### Package Development

This is a monorepo with the following workspaces:

- **evm-gateway**: Core gateway framework
- **l1-gateway**: L1 Ethereum gateway
- **op-gateway**: Optimism gateway  
- **arb-gateway**: Arbitrum gateway
- **scroll-gateway**: Scroll gateway
- **evm-verifier**: Core verifier library
- **l1-verifier**: L1 verifier with tests
- **op-verifier**: Optimism verifier
- **arb-verifier**: Arbitrum verifier  
- **scroll-verifier**: Scroll verifier

### Working with Individual Packages

```bash
# Navigate to a package
cd evm-gateway

# Install package-specific dependencies
bun install

# Run package-specific scripts
bun run build
bun run lint
bun run test

# Or from root directory:
bun run workspace evm-gateway build
```

## IDE Setup

### VS Code (Recommended)

The repository includes VS Code workspace settings. Install these recommended extensions:

- **TypeScript**: Built-in TypeScript support
- **ESLint**: Code linting
- **Prettier**: Code formatting  
- **Solidity**: Smart contract support
- **GitLens**: Enhanced Git integration

VS Code will automatically:
- Use the correct TypeScript version
- Apply ESLint and Prettier on save
- Recognize the monorepo structure

### Other IDEs

For other editors, ensure you have:
- TypeScript language server configured
- ESLint integration enabled
- Prettier formatting on save
- Solidity syntax highlighting

## Environment Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the template
cp .env.example .env

# Edit with your configuration
vim .env
```

Required environment variables:

```env
# RPC endpoints for testing
L1_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY
L2_OPTIMISM_RPC_URL=https://mainnet.optimism.io
L2_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
L2_SCROLL_RPC_URL=https://rpc.scroll.io

# Optional: Development settings  
NODE_ENV=development
DEBUG=evmgateway:*
```

### Development vs Production

The codebase supports different environments:

- **Development**: Uses local test networks and mock data
- **Testing**: Automated test environments
- **Production**: Live network deployments

## Testing

### Running Tests

```bash
# All tests
bun run test

# Specific package tests
bun run workspace l1-verifier test

# With coverage
bun run test:coverage

# Watch mode for development
bun run test:watch
```

### Test Types

1. **Unit Tests**: Individual function/class testing
2. **Integration Tests**: Cross-package functionality
3. **End-to-End Tests**: Full gateway workflows
4. **Smart Contract Tests**: Solidity contract testing via Hardhat

### Writing Tests

- Unit tests: `*.test.ts` files alongside source code
- Integration tests: `test/integration/` directory  
- E2E tests: `test/e2e/` directory
- Contract tests: `test/` directory in verifier packages

## Troubleshooting

### Common Issues

#### 1. Build Order Dependencies

**Error**: `Cannot find module '@ensdomains/evm-gateway'`

**Solution**: Build the core package first:
```bash
bun run workspace evm-gateway build
bun install
```

#### 2. Network Connectivity Issues  

**Error**: `Couldn't download compiler version list`

**Solutions**:
```bash
# Option 1: Use different Solidity compiler source
export SOLC_BINARY_PATH=/usr/local/bin/solc

# Option 2: Use cached compiler
bun run workspace l1-verifier compile:cache

# Option 3: Configure proxy if behind corporate firewall
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

#### 3. GitHub API Rate Limiting

**Error**: `GET https://api.github.com/repos/... - 403`

**Solutions**:
```bash
# Use NPM registry instead
bun install --registry https://registry.npmjs.org/

# Or authenticate with GitHub
export GITHUB_TOKEN=your_github_token
```

#### 4. Memory Issues

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or use Bun's memory management
bun --max-old-space-size=4096 run build
```

#### 5. Hardhat Network Issues

**Error**: `HH502: Couldn't download compiler`

**Solution**:
```bash
# Use local hardhat network
cd l1-verifier
bunx hardhat node --network hardhat

# Or install Solidity compiler manually
curl -L https://github.com/ethereum/solidity/releases/download/v0.8.19/solc-static-linux -o /usr/local/bin/solc
chmod +x /usr/local/bin/solc
```

### Getting Help

1. **Check existing issues**: [GitHub Issues](https://github.com/ensdomains/evmgateway/issues)
2. **Repository discussions**: [GitHub Discussions](https://github.com/ensdomains/evmgateway/discussions)
3. **ENS Discord**: Development channels
4. **Documentation**: See individual package README files

### Performance Tips

- **Parallel Builds**: Bun runs builds in parallel by default
- **Incremental TypeScript**: Enabled in tsconfig.json
- **Cache Management**: Clean caches with `bun run dev:clean`
- **Selective Testing**: Run only changed packages during development

## Contributing

### Pre-commit Hooks

The repository uses Husky for pre-commit hooks:

```bash
# Hooks are automatically installed with bun install
# Manually trigger hooks:
bunx husky install
```

### Code Style

- **Formatting**: Prettier (auto-format on save)
- **Linting**: ESLint with TypeScript rules
- **Commit Messages**: Conventional commit format preferred

### Pull Request Workflow  

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and ensure tests pass
4. Run linting: `bun run lint`
5. Commit changes with clear messages
6. Push and create a pull request

## Architecture Overview

### Gateway Pattern

Each gateway implementation follows the same pattern:
1. **Gateway Service**: Handles CCIP-Read requests
2. **Proof Service**: Generates merkle proofs
3. **Verifier Contract**: Validates proofs on-chain

### Key Components

- **EVMFetcher**: Solidity library for cross-chain reads
- **EVMVerifier**: Base verification logic
- **Chain-specific Gateways**: L2-specific implementations
- **Proof Generation**: Merkle tree proof services

This setup enables trustless cross-chain data retrieval with cryptographic verification.