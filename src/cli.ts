#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateAppleJWT } from './generator.js';
import { ConfigManager } from './config.js';
import { runInteractiveMode } from './interactive.js';
import { JWTConfig, CLIOptions } from './types.js';

class CLI {
  private args: string[];
  private options: CLIOptions = {};

  constructor(args: string[]) {
    this.args = args.slice(2); // Remove 'node' and script path
    this.parseArguments();
  }

  private parseArguments(): void {
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      const nextArg = this.args[i + 1];

      switch (arg) {
        case '--key-id':
        case '-k':
          this.options.keyId = nextArg;
          i++;
          break;
        case '--team-id':
        case '-t':
          this.options.teamId = nextArg;
          i++;
          break;
        case '--private-key':
        case '-p':
          this.options.privateKey = nextArg;
          i++;
          break;
        case '--expires-in':
        case '-e':
          this.options.expiresIn = parseInt(nextArg, 10);
          i++;
          break;
        case '--algorithm':
        case '-a':
          this.options.algorithm = nextArg;
          i++;
          break;
        case '--output':
        case '-o':
          this.options.output = nextArg;
          i++;
          break;
        case '--help':
        case '-h':
          this.options.help = true;
          break;
        case '--version':
        case '-v':
          this.options.version = true;
          break;
        default:
          if (arg.startsWith('-')) {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
          }
          break;
      }
    }
  }

  private showHelp(): void {
    console.log(`
Apple JWT Generator

USAGE:
  npx @jimmyclchu/apple-jwt [options]                    # Interactive mode
  npx @jimmyclchu/apple-jwt -k <keyId> -t <teamId> -p <privateKey> [options]

OPTIONS:
  -k, --key-id <string>       Apple Key ID (required)
  -t, --team-id <string>      Apple Team ID (required)  
  -p, --private-key <string>  Private key content or file path (required)
  -e, --expires-in <number>   Token expiration in days (default: 180)
  -a, --algorithm <string>    JWT algorithm (default: ES256)
  -o, --output <string>       Output file path (default: stdout)
  -h, --help                  Show this help message
  -v, --version               Show version

EXAMPLES:
  # Interactive mode
  npx @jimmyclchu/apple-jwt

  # Command line mode
  npx @jimmyclchu/apple-jwt -k ABC123DEF4 -t XYZ789GHI0 -p ./private-key.pem

  # With custom expiration and output file
  npx @jimmyclchu/apple-jwt -k ABC123DEF4 -t XYZ789GHI0 -p ./private-key.pem -e 30 -o token.jwt

ENVIRONMENT VARIABLES:
  - APPLE_KEY_ID
  - APPLE_TEAM_ID  
  - APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH
  - APPLE_JWT_EXPIRES_IN
  - APPLE_JWT_ALGORITHM
`);
  }

  private showVersion(): void {
    // In a real package, you'd import this from package.json
    console.log('1.0.0');
  }

  private hasRequiredOptions(): boolean {
    return !!(this.options.keyId && this.options.teamId && this.options.privateKey);
  }

  private async runInteractive(): Promise<void> {
    const result = await runInteractiveMode();
    if (!result) {
      process.exit(0);
    }

    const { config, output } = result;
    await this.generateAndOutput(config, output);
  }

  private async runCommandLine(): Promise<void> {
    const configManager = new ConfigManager();
    const envConfig = configManager.validateEnvironmentVariables();
    
    const finalConfig = configManager.resolveConfig(this.options, null);
    Object.assign(finalConfig, envConfig);

    if (!finalConfig.keyId || !finalConfig.teamId || !finalConfig.privateKey) {
      console.error('Error: Missing required parameters. Use --help for usage information.');
      console.error('Required: --key-id, --team-id, --private-key');
      process.exit(1);
    }

    await this.generateAndOutput(finalConfig as JWTConfig, this.options.output);
  }

  private async generateAndOutput(config: JWTConfig, outputPath?: string): Promise<void> {
    try {
      console.log('Generating Apple JWT...');
      
      const token = generateAppleJWT(config);
      
      if (outputPath) {
        const fullPath = resolve(process.cwd(), outputPath);
        writeFileSync(fullPath, token, 'utf8');
        console.log(`JWT saved to: ${fullPath}`);
      } else {
        console.log('JWT generated successfully:\n');
        console.log(token);
      }
    } catch (error) {
      console.error('Error generating JWT:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  public async run(): Promise<void> {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    if (this.options.version) {
      this.showVersion();
      return;
    }

    // If no arguments provided or incomplete arguments, run interactive mode
    if (this.args.length === 0 || !this.hasRequiredOptions()) {
      await this.runInteractive();
    } else {
      await this.runCommandLine();
    }
  }
}

async function main(): Promise<void> {
  try {
    const cli = new CLI(process.argv);
    await cli.run();
  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});