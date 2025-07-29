import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigFile, JWTConfig } from './types.js';

export class ConfigManager {
  private configPaths = [
    '.applejwt.json',
    '.applejwt.config.json',
    'applejwt.config.json'
  ];

  public loadConfigFile(): ConfigFile | null {
    for (const configPath of this.configPaths) {
      const fullPath = resolve(process.cwd(), configPath);
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          const config = JSON.parse(content) as ConfigFile;
          return config;
        } catch (error) {
          console.warn(`Warning: Failed to parse config file ${configPath}: ${error}`);
          continue;
        }
      }
    }
    return null;
  }

  public resolveConfig(
    cliOptions: Partial<JWTConfig> = {},
    configFile: ConfigFile | null = null
  ): Partial<JWTConfig> {
    const defaults = {
      expiresIn: 180,
      algorithm: 'ES256'
    };

    let privateKey = cliOptions.privateKey;
    
    if (!privateKey && configFile?.privateKeyPath) {
      const keyPath = resolve(process.cwd(), configFile.privateKeyPath);
      if (existsSync(keyPath)) {
        privateKey = keyPath;
      } else {
        throw new Error(`Private key file not found: ${configFile.privateKeyPath}`);
      }
    }

    return {
      ...defaults,
      ...configFile,
      ...cliOptions,
      privateKey
    };
  }

  public validateEnvironmentVariables(): Partial<JWTConfig> {
    const env: Partial<JWTConfig> = {};

    if (process.env.APPLE_KEY_ID) {
      env.keyId = process.env.APPLE_KEY_ID;
    }
    if (process.env.APPLE_TEAM_ID) {
      env.teamId = process.env.APPLE_TEAM_ID;
    }
    if (process.env.APPLE_PRIVATE_KEY) {
      env.privateKey = process.env.APPLE_PRIVATE_KEY;
    } else if (process.env.APPLE_PRIVATE_KEY_PATH) {
      const keyPath = resolve(process.cwd(), process.env.APPLE_PRIVATE_KEY_PATH);
      if (existsSync(keyPath)) {
        env.privateKey = keyPath;
      }
    }
    if (process.env.APPLE_JWT_EXPIRES_IN) {
      const expiresIn = parseInt(process.env.APPLE_JWT_EXPIRES_IN, 10);
      if (!isNaN(expiresIn)) {
        env.expiresIn = expiresIn;
      }
    }
    if (process.env.APPLE_JWT_ALGORITHM) {
      env.algorithm = process.env.APPLE_JWT_ALGORITHM;
    }

    return env;
  }

  public buildFinalConfig(): Partial<JWTConfig> {
    const envVars = this.validateEnvironmentVariables();
    
    return this.resolveConfig(envVars, null);
  }
}

export function loadConfig(): Partial<JWTConfig> {
  const manager = new ConfigManager();
  return manager.buildFinalConfig();
}