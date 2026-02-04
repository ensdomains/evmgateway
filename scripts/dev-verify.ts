#!/usr/bin/env bun

/**
 * Development environment verification script
 * Checks if the development environment is properly configured
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

class EnvironmentChecker {
  private results: CheckResult[] = [];
  
  private log(result: CheckResult) {
    this.results.push(result);
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  }

  private async checkCommand(name: string, command: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`which ${command}`);
      if (stdout.trim()) {
        const { stdout: version } = await execAsync(`${command} --version`);
        this.log({
          name: `${name} Installation`,
          status: 'pass',
          message: `Found ${command}`,
          details: version.split('\n')[0]
        });
        return true;
      }
    } catch (error) {
      this.log({
        name: `${name} Installation`,
        status: 'fail', 
        message: `${command} not found`,
        details: 'Please install and ensure it\'s in your PATH'
      });
    }
    return false;
  }

  private checkFile(name: string, path: string, required: boolean = true): boolean {
    if (existsSync(path)) {
      const stats = statSync(path);
      this.log({
        name,
        status: 'pass',
        message: `Found ${path}`,
        details: stats.isDirectory() ? 'Directory' : `File (${stats.size} bytes)`
      });
      return true;
    } else {
      this.log({
        name,
        status: required ? 'fail' : 'warn',
        message: `Missing ${path}`,
        details: required ? 'Required for development' : 'Optional but recommended'
      });
      return false;
    }
  }

  private async checkWorkspacePackage(packageName: string): Promise<boolean> {
    const packagePath = join(process.cwd(), packageName);
    const packageJsonPath = join(packagePath, 'package.json');
    
    if (!this.checkFile(`${packageName} Package`, packagePath)) {
      return false;
    }
    
    if (!this.checkFile(`${packageName} package.json`, packageJsonPath)) {
      return false;
    }

    // Check if package is built (has dist/_cjs/_esm directories)
    const buildDirs = ['_cjs', '_esm', '_types', 'dist'];
    let hasBuilds = false;
    
    for (const dir of buildDirs) {
      const buildPath = join(packagePath, dir);
      if (existsSync(buildPath)) {
        hasBuilds = true;
        break;
      }
    }

    if (hasBuilds) {
      this.log({
        name: `${packageName} Build`,
        status: 'pass',
        message: 'Package is built'
      });
    } else {
      this.log({
        name: `${packageName} Build`, 
        status: 'warn',
        message: 'Package not built',
        details: `Run: bun run workspace ${packageName} build`
      });
    }

    return true;
  }

  private async checkNodeModules(): Promise<boolean> {
    if (!this.checkFile('Node Modules', 'node_modules')) {
      return false;
    }

    try {
      const { stdout } = await execAsync('bun pm ls 2>/dev/null | wc -l');
      const packageCount = parseInt(stdout.trim());
      
      if (packageCount > 0) {
        this.log({
          name: 'Dependencies',
          status: 'pass', 
          message: `${packageCount} packages installed`
        });
        return true;
      } else {
        this.log({
          name: 'Dependencies',
          status: 'warn',
          message: 'No packages found',
          details: 'Run: bun install'
        });
        return false;
      }
    } catch (error) {
      this.log({
        name: 'Dependencies',
        status: 'warn',
        message: 'Could not check package count',
        details: 'Dependencies may still be properly installed'
      });
      return true;
    }
  }

  private async checkBuildSystem(): Promise<boolean> {
    const checks: Promise<boolean>[] = [];
    
    // Check TypeScript
    checks.push(this.checkTypeScript());
    
    // Check ESLint
    checks.push(this.checkESLint());
    
    // Check if core package is built
    checks.push(this.checkCorePackageBuild());

    const results = await Promise.all(checks);
    return results.every(result => result);
  }

  private async checkTypeScript(): Promise<boolean> {
    try {
      // Check if TypeScript is available
      const { stdout: tscVersion } = await execAsync('bunx tsc --version');
      this.log({
        name: 'TypeScript',
        status: 'pass',
        message: 'TypeScript available',
        details: tscVersion.trim()
      });

      // Try to compile a simple TypeScript file
      const testTs = 'const test: string = "hello"; console.log(test);';
      const { stderr } = await execAsync(`echo '${testTs}' | bunx tsc --noEmit --stdin`);
      
      if (stderr && stderr.includes('error')) {
        this.log({
          name: 'TypeScript Config',
          status: 'warn', 
          message: 'TypeScript configuration issues',
          details: stderr.slice(0, 200)
        });
        return false;
      }

      return true;
    } catch (error) {
      this.log({
        name: 'TypeScript',
        status: 'fail',
        message: 'TypeScript not working',
        details: 'Check TypeScript installation and configuration'
      });
      return false;
    }
  }

  private async checkESLint(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('bunx eslint --version');
      this.log({
        name: 'ESLint',
        status: 'pass',
        message: 'ESLint available', 
        details: stdout.trim()
      });
      return true;
    } catch (error) {
      this.log({
        name: 'ESLint',
        status: 'warn',
        message: 'ESLint not available',
        details: 'Linting may not work properly'
      });
      return false;
    }
  }

  private async checkCorePackageBuild(): Promise<boolean> {
    const evmGatewayPath = 'evm-gateway';
    const buildDirs = ['_cjs', '_esm', '_types'];
    
    let allBuildsExist = true;
    for (const dir of buildDirs) {
      const buildPath = join(evmGatewayPath, dir);
      if (!existsSync(buildPath)) {
        allBuildsExist = false;
        break;
      }
    }

    if (allBuildsExist) {
      this.log({
        name: 'Core Package Build',
        status: 'pass',
        message: 'evm-gateway package is built'
      });
      return true;
    } else {
      this.log({
        name: 'Core Package Build',
        status: 'fail',
        message: 'evm-gateway package not built',
        details: 'Run: bun run workspace evm-gateway build'
      });
      return false;
    }
  }

  private async checkEnvironment(): Promise<boolean> {
    // Check for .env file
    const hasEnv = this.checkFile('Environment File', '.env', false);
    
    // Check for .env.example
    this.checkFile('Environment Template', '.env.example', false);
    
    return true; // Environment file is optional
  }

  private checkIDESetup(): boolean {
    const ideFiles = [
      { name: 'VS Code Workspace', path: 'evmgateway.code-workspace', required: false },
      { name: 'VS Code Settings', path: '.vscode/settings.json', required: false },
      { name: 'VS Code Launch Config', path: '.vscode/launch.json', required: false }
    ];

    let ideSetup = false;
    for (const file of ideFiles) {
      if (this.checkFile(file.name, file.path, file.required)) {
        ideSetup = true;
      }
    }

    return ideSetup;
  }

  private async checkGitSetup(): Promise<boolean> {
    // Check if we're in a git repository
    if (!this.checkFile('Git Repository', '.git')) {
      return false;
    }

    // Check for git hooks
    const hooksPath = '.git/hooks';
    if (existsSync(hooksPath)) {
      const huskyPath = '.husky';
      const hasHusky = this.checkFile('Husky Git Hooks', huskyPath, false);
      
      if (hasHusky) {
        this.log({
          name: 'Git Hooks',
          status: 'pass',
          message: 'Git hooks configured with Husky'
        });
      } else {
        this.log({
          name: 'Git Hooks', 
          status: 'warn',
          message: 'No Husky configuration found',
          details: 'Pre-commit hooks may not be active'
        });
      }
    }

    return true;
  }

  public async runAllChecks(): Promise<void> {
    console.log('🔍 Verifying evmgateway development environment...\n');

    // Basic system checks
    const hasNode = await this.checkCommand('Node.js', 'node');
    const hasBun = await this.checkCommand('Bun', 'bun');
    const hasGit = await this.checkCommand('Git', 'git');

    if (!hasNode || !hasBun || !hasGit) {
      console.log('\n❌ Basic requirements not met. Please install missing tools.');
      return;
    }

    // Project structure checks
    console.log('\nChecking project structure...');
    this.checkFile('Package JSON', 'package.json');
    this.checkFile('TypeScript Config', 'tsconfig.json');
    this.checkFile('ESLint Config', '.eslintrc.json', false);
    this.checkFile('Prettier Config', '.prettierrc', false);

    // Dependency checks
    console.log('\nChecking dependencies...');
    await this.checkNodeModules();

    // Workspace checks
    console.log('\nChecking workspace packages...');
    const workspaces = [
      'evm-gateway',
      'evm-verifier', 
      'l1-gateway',
      'l1-verifier',
      'op-gateway',
      'op-verifier',
      'arb-gateway',
      'arb-verifier',
      'scroll-gateway',
      'scroll-verifier'
    ];

    for (const workspace of workspaces) {
      await this.checkWorkspacePackage(workspace);
    }

    // Build system checks
    console.log('\nChecking build system...');
    await this.checkBuildSystem();

    // Environment checks
    console.log('\nChecking environment setup...');
    await this.checkEnvironment();

    // IDE setup checks
    console.log('\nChecking IDE setup...');
    this.checkIDESetup();

    // Git setup checks
    console.log('\nChecking Git setup...');
    await this.checkGitSetup();

    // Summary
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('DEVELOPMENT ENVIRONMENT VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warned = this.results.filter(r => r.status === 'warn').length; 
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;

    console.log(`\n📊 Results: ${passed}/${total} checks passed`);
    if (warned > 0) console.log(`⚠️  ${warned} warnings`);
    if (failed > 0) console.log(`❌ ${failed} failures`);

    if (failed === 0 && warned <= 2) {
      console.log('\n🎉 Your development environment is ready!');
      console.log('\nNext steps:');
      console.log('  1. Edit .env with your configuration');
      console.log('  2. Run: bun run test');
      console.log('  3. Start developing!');
    } else if (failed === 0) {
      console.log('\n✅ Your development environment is mostly ready!');
      console.log('Some optional components are missing but you can start developing.');
    } else {
      console.log('\n🔧 Your development environment needs attention.');
      console.log('Please resolve the failed checks above.');
      
      const criticalFailures = this.results.filter(r => 
        r.status === 'fail' && (
          r.name.includes('Installation') ||
          r.name.includes('Core Package Build') ||
          r.name.includes('Package JSON')
        )
      );

      if (criticalFailures.length > 0) {
        console.log('\nCritical issues to fix first:');
        criticalFailures.forEach(failure => {
          console.log(`  • ${failure.name}: ${failure.message}`);
          if (failure.details) console.log(`    ${failure.details}`);
        });
      }
    }

    console.log('\nFor help, see:');
    console.log('  • DEVELOPMENT.md - Comprehensive setup guide');
    console.log('  • TROUBLESHOOTING.md - Common issues and solutions');
    console.log('  • ./scripts/dev-setup.sh - Automated setup script');
  }
}

// Run the verification
const checker = new EnvironmentChecker();
checker.runAllChecks().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});