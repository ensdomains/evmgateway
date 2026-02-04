# 🚀 evmgateway Development Environment 

Welcome to the evmgateway development environment! This repository now includes comprehensive setup and development tools.

## Quick Start

```bash
# Option 1: Automated Setup
./scripts/dev-setup.sh

# Option 2: Manual Setup  
bun install
bun run workspace evm-gateway build
bun install
bun run test

# Verify your setup
bun run dev:verify
```

## 📁 New Development Files

| File | Description |
|------|-------------|
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | 📖 Comprehensive setup guide & workflows |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | 🔧 Common issues & solutions |
| **[Makefile](Makefile)** | ⚡ Convenient development shortcuts |
| **[.env.example](.env.example)** | 🔧 Environment configuration template |
| **[scripts/dev-setup.sh](scripts/dev-setup.sh)** | 🤖 Automated environment setup |
| **[scripts/dev-verify.ts](scripts/dev-verify.ts)** | ✅ Environment verification tool |

## 🛠️ Available Commands

### Package.json Scripts
```bash
bun run dev:setup      # Run automated setup
bun run dev:verify     # Verify environment setup
bun run dev:clean      # Clean build artifacts
bun run build:all      # Build all packages
bun run test:watch     # Run tests in watch mode
```

### Makefile Shortcuts
```bash
make setup         # Complete environment setup
make build         # Build all packages
make test          # Run tests
make lint          # Lint code
make clean         # Clean artifacts
make info          # Show environment info
```

## 🎯 Development Workflow

1. **Setup**: Use `./scripts/dev-setup.sh` or follow [DEVELOPMENT.md](DEVELOPMENT.md)
2. **Code**: Use VS Code with the provided workspace settings
3. **Build**: `make build` or `bun run build:all`
4. **Test**: `make test` or `bun run test`
5. **Debug**: Use VS Code debug configurations in `.vscode/launch.json`

## 🏗️ Project Architecture

- **evm-gateway** - Core gateway framework
- **evm-verifier** - Core verification library
- **l1-gateway/l1-verifier** - Ethereum L1 implementation
- **op-gateway/op-verifier** - Optimism L2 implementation  
- **arb-gateway/arb-verifier** - Arbitrum L2 implementation
- **scroll-gateway/scroll-verifier** - Scroll L2 implementation

## 📖 Documentation

- **[README.md](README.md)** - Project overview and basic setup
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Detailed development guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Issue resolution guide
- Individual package READMEs for specific documentation

## 🔧 VS Code Integration

Open `evmgateway.code-workspace` in VS Code for:
- ✅ Optimal TypeScript configuration
- ✅ ESLint & Prettier integration
- ✅ Debug configurations
- ✅ Multi-root workspace support
- ✅ Solidity syntax highlighting

## 🚨 Need Help?

1. **Setup Issues**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. **Development Questions**: Check [DEVELOPMENT.md](DEVELOPMENT.md)
3. **Bug Reports**: [GitHub Issues](https://github.com/ensdomains/evmgateway/issues)
4. **Feature Requests**: [GitHub Discussions](https://github.com/ensdomains/evmgateway/discussions)

---

**Happy coding! 🎉**