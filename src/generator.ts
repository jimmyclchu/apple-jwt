import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { JWTConfig, JWTPayload, JWTHeader } from './types.js';

export class AppleJWTGenerator {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = {
      expiresIn: 180,
      algorithm: 'ES256',
      ...config
    };
  }

  private isFilePath(input: string): boolean {
    return input.includes('/') || input.includes('\\') || input.endsWith('.pem') || input.endsWith('.p8');
  }

  private getPrivateKey(): string {
    const { privateKey } = this.config;
    
    if (this.isFilePath(privateKey)) {
      if (!existsSync(privateKey)) {
        throw new Error(`Private key file not found: ${privateKey}`);
      }
      try {
        return readFileSync(privateKey, 'utf8');
      } catch (error) {
        throw new Error(`Failed to read private key file: ${error}`);
      }
    }
    
    return privateKey;
  }

  private createPayload(): JWTPayload {
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + (this.config.expiresIn! * 24 * 60 * 60); // Convert days to seconds

    return {
      iss: this.config.teamId,
      iat: now,
      exp: expiration
    };
  }

  private createHeader(): JWTHeader {
    return {
      alg: this.config.algorithm!,
      kid: this.config.keyId
    };
  }

  public generate(): string {
    try {
      const privateKey = this.getPrivateKey();
      const payload = this.createPayload();
      const header = this.createHeader();

      const token = jwt.sign(
        payload,
        privateKey,
        {
          algorithm: this.config.algorithm as jwt.Algorithm,
          header: header
        }
      );

      return token;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`JWT generation failed: ${error.message}`);
      }
      throw new Error('JWT generation failed: Unknown error');
    }
  }

  public static validateConfig(config: Partial<JWTConfig>): void {
    if (!config.keyId) {
      throw new Error('Apple Key ID is required');
    }
    if (!config.teamId) {
      throw new Error('Apple Team ID is required');
    }
    if (!config.privateKey) {
      throw new Error('Private key is required');
    }
    if (config.expiresIn !== undefined && (config.expiresIn <= 0 || config.expiresIn > 365)) {
      throw new Error('Expiration days must be between 1 and 365');
    }
  }
}

export function generateAppleJWT(config: JWTConfig): string {
  AppleJWTGenerator.validateConfig(config);
  const generator = new AppleJWTGenerator(config);
  return generator.generate();
}