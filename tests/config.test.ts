import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigManager, loadConfig } from '../src/config.js';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Config file support removed - tool uses interactive/CLI mode only

  describe('resolveConfig', () => {
    it('should merge defaults and CLI options correctly', () => {
      const cliOptions = {
        keyId: 'MOCK_CLI_KEY_ID',
        expiresIn: 30,
        privateKey: 'MOCK_CLI_PRIVATE_KEY'
      };

      const result = configManager.resolveConfig(cliOptions, null);

      expect(result).toEqual({
        expiresIn: 30,        // CLI overrides default (180)
        algorithm: 'ES256',   // Default
        keyId: 'MOCK_CLI_KEY_ID',
        privateKey: 'MOCK_CLI_PRIVATE_KEY'
      });
    });

    it('should use defaults when no options provided', () => {
      const result = configManager.resolveConfig({}, null);
      
      expect(result).toEqual({
        expiresIn: 180,
        algorithm: 'ES256'
      });
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('should extract config from environment variables', () => {
      process.env.APPLE_KEY_ID = 'MOCK_ENV_KEY_ID';
      process.env.APPLE_TEAM_ID = 'MOCK_ENV_TEAM_ID';
      process.env.APPLE_PRIVATE_KEY = 'MOCK_ENV_PRIVATE_KEY';
      process.env.APPLE_JWT_EXPIRES_IN = '30';
      process.env.APPLE_JWT_ALGORITHM = 'ES384';

      const result = configManager.validateEnvironmentVariables();

      expect(result).toEqual({
        keyId: 'MOCK_ENV_KEY_ID',
        teamId: 'MOCK_ENV_TEAM_ID',
        privateKey: 'MOCK_ENV_PRIVATE_KEY',
        expiresIn: 30,
        algorithm: 'ES384'
      });
    });

    it('should handle private key path from environment', () => {
      const mockExistsSync = vi.mocked(existsSync);
      const mockResolve = vi.mocked(resolve);
      
      process.env.APPLE_PRIVATE_KEY_PATH = './mock-env-private-key.pem';
      
      mockResolve.mockReturnValue('/resolved/mock-env-private-key.pem');
      mockExistsSync.mockReturnValue(true);

      const result = configManager.validateEnvironmentVariables();
      expect(result.privateKey).toBe('/resolved/mock-env-private-key.pem');
    });

    it('should ignore invalid expires_in from environment', () => {
      process.env.APPLE_JWT_EXPIRES_IN = 'invalid';

      const result = configManager.validateEnvironmentVariables();
      expect(result.expiresIn).toBeUndefined();
    });

    it('should return empty object when no environment variables are set', () => {
      const result = configManager.validateEnvironmentVariables();
      expect(result).toEqual({});
    });

    it('should prefer APPLE_PRIVATE_KEY over APPLE_PRIVATE_KEY_PATH', () => {
      process.env.APPLE_PRIVATE_KEY = 'MOCK_DIRECT_KEY_CONTENT';
      process.env.APPLE_PRIVATE_KEY_PATH = './mock-some-key.pem';

      const result = configManager.validateEnvironmentVariables();
      expect(result.privateKey).toBe('MOCK_DIRECT_KEY_CONTENT');
    });
  });

  describe('buildFinalConfig', () => {
    it('should use environment variables only', () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(false); // No config file

      // Set environment variables
      process.env.APPLE_KEY_ID = 'MOCK_ENV_KEY_ID';
      process.env.APPLE_PRIVATE_KEY = 'MOCK_ENV_PRIVATE_KEY';

      const result = configManager.buildFinalConfig();

      expect(result).toEqual({
        expiresIn: 180,
        algorithm: 'ES256',
        keyId: 'MOCK_ENV_KEY_ID',
        privateKey: 'MOCK_ENV_PRIVATE_KEY'
      });
    });
  });

  describe('loadConfig function', () => {
    it('should return final merged configuration', () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(false); // No config file

      process.env.APPLE_KEY_ID = 'MOCK_ENV_KEY_ID';

      const result = loadConfig();

      expect(result).toEqual({
        expiresIn: 180,
        algorithm: 'ES256',
        keyId: 'MOCK_ENV_KEY_ID'
      });
    });
  });
});