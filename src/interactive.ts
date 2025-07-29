import { input, select } from '@inquirer/prompts';
import { existsSync } from 'fs';
import { JWTConfig } from './types.js';

export class InteractivePromptManager {
  private async promptKeyId(): Promise<string> {
    return await input({
      message: 'Enter Apple Key ID:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Apple Key ID is required';
        }
        if (input.length < 8) {
          return 'Apple Key ID seems too short (should be 10 characters)';
        }
        return true;
      }
    });
  }

  private async promptTeamId(): Promise<string> {
    return await input({
      message: 'Enter Apple Team ID:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Apple Team ID is required';
        }
        if (input.length < 8) {
          return 'Apple Team ID seems too short (should be 10 characters)';
        }
        return true;
      }
    });
  }

  private async promptPrivateKey(): Promise<string> {
    return await input({
      message: 'Enter Private Key (paste content or file path):',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Private key is required';
        }
        
        const trimmed = input.trim();
        
        // Check if it looks like a file path
        if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.endsWith('.pem') || trimmed.endsWith('.p8')) {
          if (!existsSync(trimmed)) {
            return `Private key file not found: ${trimmed}`;
          }
        } else {
          // Check if it looks like a valid private key content
          if (!trimmed.includes('-----BEGIN') || !trimmed.includes('-----END')) {
            return 'Private key content should include BEGIN and END markers';
          }
        }
        
        return true;
      }
    });
  }

  private async promptExpiresIn(): Promise<string> {
    return await input({
      message: 'Enter expiration days:',
      default: '180',
      validate: (input: string) => {
        const num = parseInt(input, 10);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (num <= 0 || num > 365) {
          return 'Expiration days must be between 1 and 365';
        }
        return true;
      }
    });
  }

  private async promptAlgorithm(): Promise<string> {
    return await select({
      message: 'Select JWT algorithm:',
      choices: [
        { name: 'ES256 (Recommended)', value: 'ES256' },
        { name: 'ES384', value: 'ES384' },
        { name: 'ES512', value: 'ES512' }
      ],
      default: 'ES256'
    });
  }

  private async promptOutput(): Promise<string | undefined> {
    const shouldSaveToFile = await select({
      message: 'Where should the JWT be output?',
      choices: [
        { name: 'Console (stdout)', value: 'console' },
        { name: 'Save to file', value: 'file' }
      ],
      default: 'console'
    });

    if (shouldSaveToFile === 'file') {
      return await input({
        message: 'Enter output file path:',
        default: 'apple-jwt.txt',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Output file path is required';
          }
          return true;
        }
      });
    }

    return undefined;
  }

  public async collectAllInputs(): Promise<{ config: JWTConfig; output?: string }> {
    console.log('Apple JWT Generator - Interactive Mode\n');

    const keyId = await this.promptKeyId();
    const teamId = await this.promptTeamId();
    const privateKey = await this.promptPrivateKey();
    const expiresInStr = await this.promptExpiresIn();
    const algorithm = await this.promptAlgorithm();
    const output = await this.promptOutput();

    const config: JWTConfig = {
      keyId,
      teamId,
      privateKey,
      expiresIn: parseInt(expiresInStr, 10),
      algorithm
    };

    return { config, output };
  }

  public async confirmGeneration(config: JWTConfig): Promise<boolean> {
    console.log('\nConfiguration Summary:');
    console.log(`   Key ID: ${config.keyId}`);
    console.log(`   Team ID: ${config.teamId}`);
    console.log(`   Private Key: ${config.privateKey.includes('/') ? 'File path' : 'Inline content'}`);
    console.log(`   Expires In: ${config.expiresIn} days`);
    console.log(`   Algorithm: ${config.algorithm}`);

    const confirm = await select({
      message: 'Generate JWT with these settings?',
      choices: [
        { name: 'Yes, generate JWT', value: true },
        { name: 'No, cancel', value: false }
      ],
      default: true
    });

    return confirm;
  }
}

export async function runInteractiveMode(): Promise<{ config: JWTConfig; output?: string } | null> {
  const promptManager = new InteractivePromptManager();
  
  try {
    const { config, output } = await promptManager.collectAllInputs();
    
    const confirmed = await promptManager.confirmGeneration(config);
    if (!confirmed) {
      console.log('JWT generation cancelled');
      return null;
    }

    return { config, output };
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('\nGoodbye!');
      return null;
    }
    throw error;
  }
}