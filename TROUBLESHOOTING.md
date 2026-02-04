# Troubleshooting Guide

This guide covers common issues you may encounter while setting up or developing with evmgateway and their solutions.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Issues](#build-issues)
- [Test Issues](#test-issues)
- [Runtime Issues](#runtime-issues)
- [IDE Issues](#ide-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

## Installation Issues

### Issue: `bun: command not found`

**Cause**: Bun package manager is not installed or not in PATH.

**Solution**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Verify installation
bun --version
```

### Issue: `Cannot find module '@ensdomains/evm-gateway'`

**Cause**: Core package not built before installation.

**Solution**:
```bash
# Build core package first
bun run workspace evm-gateway build

# Then install dependencies
bun install
```

### Issue: `GET https://api.github.com/repos/... - 403`

**Cause**: GitHub API rate limiting or authentication issues.

**Solutions**:

1. **Use npm registry**:
```bash
bun install --registry https://registry.npmjs.org/
```

2. **Set GitHub token**:
```bash
export GITHUB_TOKEN=your_personal_access_token
bun install
```

3. **Clear cache and retry**:
```bash
bun pm cache rm
bun install
```

### Issue: Node.js version compatibility

**Cause**: Using incompatible Node.js version.

**Solution**:
```bash
# Check current version
node --version

# Install Node.js 18+ (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## Build Issues

### Issue: TypeScript compilation errors

**Cause**: Type checking issues or missing dependencies.

**Solutions**:

1. **Clean and rebuild**:
```bash
bun run dev:clean
bun run workspace evm-gateway build
bun install
```

2. **Check TypeScript version**:
```bash
bunx tsc --version
```

3. **Install missing types**:
```bash
bun add -D @types/node
```

### Issue: `error TS2307: Cannot find module`

**Cause**: Missing type declarations or incorrect imports.

**Solutions**:

1. **Install missing packages**:
```bash
bun install
```

2. **Check import paths**:
```typescript
// Correct
import { EVMFetcher } from '@ensdomains/evm-gateway'

// Incorrect  
import { EVMFetcher } from 'evm-gateway'
```

3. **Update tsconfig.json paths**:
```json
{
  "compilerOptions": {
    "paths": {
      "@ensdomains/*": ["./*/src", "./*"]
    }
  }
}
```

### Issue: Solidity compilation fails

**Cause**: Missing compiler or network issues.

**Solutions**:

1. **Install Solidity compiler manually**:
```bash
# Linux
curl -L https://github.com/ethereum/solidity/releases/download/v0.8.19/solc-static-linux -o /usr/local/bin/solc
chmod +x /usr/local/bin/solc

# macOS
brew install solidity
```

2. **Use offline compiler**:
```bash
export SOLC_BINARY_PATH=/usr/local/bin/solc
```

3. **Configure Hardhat for offline use**:
```javascript
// hardhat.config.ts
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
}
```

## Test Issues

### Issue: `HH502: Couldn't download compiler version list`

**Cause**: Network connectivity issues or firewall blocking Solidity downloads.

**Solutions**:

1. **Check internet connection**:
```bash
curl -I https://binaries.soliditylang.org/
```

2. **Configure proxy** (if behind corporate firewall):
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

3. **Use cached compiler**:
```bash
cd l1-verifier
bunx hardhat compile --force
```

### Issue: Tests timeout

**Cause**: Network latency or resource constraints.

**Solutions**:

1. **Increase timeout**:
```bash
export TEST_TIMEOUT=60000
bun run test
```

2. **Run tests sequentially**:
```bash
bun run test --parallel=false
```

3. **Use local network**:
```bash
# Start local hardhat network
bunx hardhat node

# Run tests against local network
export L1_RPC_URL=http://localhost:8545
bun run test
```

### Issue: `JavaScript heap out of memory`

**Cause**: Insufficient memory allocation.

**Solutions**:

1. **Increase memory limit**:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
bun run test
```

2. **Use Bun's memory management**:
```bash
bun --max-old-space-size=4096 run test
```

## Runtime Issues

### Issue: RPC connection errors

**Cause**: Invalid or rate-limited RPC endpoints.

**Solutions**:

1. **Check RPC endpoint**:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/YOUR_API_KEY
```

2. **Use alternative RPC providers**:
```bash
# In .env file
L1_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY
# Or
L1_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY
# Or
L1_RPC_URL=https://rpc.ankr.com/eth
```

3. **Configure retry logic**:
```typescript
const provider = new JsonRpcProvider(rpcUrl, {
  timeout: 30000,
  retryDelay: 1000,
  retryLimit: 3
})
```

### Issue: Gateway server startup fails

**Cause**: Port conflicts or configuration issues.

**Solutions**:

1. **Check port availability**:
```bash
netstat -tlnp | grep :8080
```

2. **Use different port**:
```bash
export GATEWAY_PORT=3000
bun run server
```

3. **Check environment configuration**:
```bash
cat .env | grep -v "^#" | grep -v "^$"
```

## IDE Issues

### Issue: TypeScript errors in VS Code

**Cause**: Workspace configuration or extension issues.

**Solutions**:

1. **Reload VS Code window**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Developer: Reload Window"
   - Press Enter

2. **Select correct TypeScript version**:
   - Press `Ctrl+Shift+P`
   - Type "TypeScript: Select TypeScript Version"
   - Choose "Use Workspace Version"

3. **Clear TypeScript cache**:
```bash
rm -rf .vscode/tsconfig.json.cache
rm -rf **/*.tsbuildinfo
```

### Issue: ESLint not working

**Cause**: ESLint extension configuration issues.

**Solutions**:

1. **Check ESLint extension is enabled**
2. **Restart ESLint server**:
   - Press `Ctrl+Shift+P`
   - Type "ESLint: Restart ESLint Server"

3. **Check working directories in settings.json**:
```json
{
  "eslint.workingDirectories": [
    "evm-gateway",
    "l1-verifier"
  ]
}
```

## Network Issues

### Issue: DNS resolution failures

**Cause**: Network configuration or DNS issues.

**Solutions**:

1. **Check DNS resolution**:
```bash
nslookup github.com
nslookup binaries.soliditylang.org
```

2. **Use alternative DNS servers**:
```bash
# Temporarily use Google DNS
export DNS_SERVERS="8.8.8.8,8.8.4.4"
```

3. **Configure proxy settings**:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1
```

### Issue: SSL certificate errors

**Cause**: Corporate firewall or outdated certificates.

**Solutions**:

1. **Disable SSL verification temporarily** (not recommended for production):
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

2. **Update certificates**:
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install ca-certificates

# macOS
brew install ca-certificates
```

## Performance Issues

### Issue: Slow builds

**Cause**: Large workspace or inefficient caching.

**Solutions**:

1. **Enable incremental builds**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

2. **Clean build cache**:
```bash
bun run dev:clean
```

3. **Build specific packages**:
```bash
bun run workspace evm-gateway build
```

### Issue: High memory usage

**Cause**: Memory leaks or large datasets.

**Solutions**:

1. **Increase memory limit**:
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
```

2. **Monitor memory usage**:
```bash
bun --inspect run test
```

3. **Use streaming for large data**:
```typescript
// Avoid loading large files into memory
const stream = fs.createReadStream('large-file.json')
```

## Getting Help

### Before asking for help:

1. **Check this troubleshooting guide**
2. **Search existing issues**: https://github.com/ensdomains/evmgateway/issues
3. **Check the documentation**: README.md and DEVELOPMENT.md
4. **Try the automated setup**: `./scripts/dev-setup.sh`

### When reporting issues:

1. **Include system information**:
```bash
make info  # or manually provide:
# - OS and version
# - Node.js version  
# - Bun version
# - Git version
```

2. **Provide complete error messages**:
   - Copy the full error output
   - Include stack traces
   - Show the command that caused the error

3. **Share your configuration**:
   - Relevant parts of package.json
   - Environment variables (redacted)
   - tsconfig.json (if relevant)

4. **List steps to reproduce**:
   - What commands you ran
   - What you expected to happen
   - What actually happened

### Where to get help:

- **GitHub Issues**: https://github.com/ensdomains/evmgateway/issues
- **GitHub Discussions**: https://github.com/ensdomains/evmgateway/discussions  
- **ENS Discord**: Development channels
- **Documentation**: README.md, DEVELOPMENT.md

### Creating a minimal reproduction:

1. Start with a fresh clone
2. Follow setup instructions exactly
3. Document each step that fails
4. Share the minimal code that reproduces the issue