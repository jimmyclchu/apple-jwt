import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import jwt from 'jsonwebtoken';
import { AppleJWTGenerator, generateAppleJWT } from '../src/generator.js';
import { JWTConfig } from '../src/types.js';

// Mock fs module
vi.mock('fs');
// Mock jsonwebtoken
vi.mock('jsonwebtoken');

describe('AppleJWTGenerator', () => {
  const mockPrivateKey = `-----BEGIN PRIVATE KEY-----
MOCK_PRIVATE_KEY_CONTENT_FOR_TESTING_ONLY
THIS_IS_NOT_A_REAL_PRIVATE_KEY
-----END PRIVATE KEY-----`;

  const validConfig: JWTConfig = {
    keyId: 'MOCK_KEY_ID_123',
    teamId: 'MOCK_TEAM_ID_456',
    privateKey: mockPrivateKey,
    expiresIn: 180,
    algorithm: 'ES256'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set default values for optional config properties', () => {
      const config = {
        keyId: 'MOCK_KEY_ID_123',
        teamId: 'MOCK_TEAM_ID_456',
        privateKey: mockPrivateKey
      };

      const generator = new AppleJWTGenerator(config);
      expect(generator['config'].expiresIn).toBe(180);
      expect(generator['config'].algorithm).toBe('ES256');
    });

    it('should use provided values over defaults', () => {
      const config = {
        keyId: 'MOCK_KEY_ID_123',
        teamId: 'MOCK_TEAM_ID_456',
        privateKey: mockPrivateKey,
        expiresIn: 30,
        algorithm: 'ES384'
      };

      const generator = new AppleJWTGenerator(config);
      expect(generator['config'].expiresIn).toBe(30);
      expect(generator['config'].algorithm).toBe('ES384');
    });
  });

  describe('isFilePath', () => {
    it('should detect file paths correctly', () => {
      const generator = new AppleJWTGenerator(validConfig);
      
      expect(generator['isFilePath']('./private-key.pem')).toBe(true);
      expect(generator['isFilePath']('/path/to/key.p8')).toBe(true);
      expect(generator['isFilePath']('key.pem')).toBe(true);
      expect(generator['isFilePath']('windows\\path\\key.p8')).toBe(true);
      expect(generator['isFilePath'](mockPrivateKey)).toBe(false);
    });
  });

  describe('getPrivateKey', () => {
    it('should return private key content directly when not a file path', () => {
      const generator = new AppleJWTGenerator(validConfig);
      const result = generator['getPrivateKey']();
      expect(result).toBe(mockPrivateKey);
    });

    it('should read from file when private key is a file path', () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockPrivateKey);

      const config = { ...validConfig, privateKey: './private-key.pem' };
      const generator = new AppleJWTGenerator(config);
      
      const result = generator['getPrivateKey']();
      
      expect(mockExistsSync).toHaveBeenCalledWith('./private-key.pem');
      expect(mockReadFileSync).toHaveBeenCalledWith('./private-key.pem', 'utf8');
      expect(result).toBe(mockPrivateKey);
    });

    it('should throw error when file does not exist', () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(false);

      const config = { ...validConfig, privateKey: './nonexistent.pem' };
      const generator = new AppleJWTGenerator(config);
      
      expect(() => generator['getPrivateKey']()).toThrow('Private key file not found: ./nonexistent.pem');
    });

    it('should throw error when file read fails', () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const config = { ...validConfig, privateKey: './private-key.pem' };
      const generator = new AppleJWTGenerator(config);
      
      expect(() => generator['getPrivateKey']()).toThrow('Failed to read private key file: Error: Permission denied');
    });
  });

  describe('createPayload', () => {
    it('should create valid JWT payload', () => {
      const generator = new AppleJWTGenerator(validConfig);
      const payload = generator['createPayload']();
      
      expect(payload.iss).toBe('MOCK_TEAM_ID_456');
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.exp).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
      
      // Check expiration is roughly 180 days from now
      const expectedExp = payload.iat + (180 * 24 * 60 * 60);
      expect(Math.abs(payload.exp - expectedExp)).toBeLessThan(2); // Allow 2 second variance
    });

    it('should use custom expiration time', () => {
      const config = { ...validConfig, expiresIn: 30 };
      const generator = new AppleJWTGenerator(config);
      const payload = generator['createPayload']();
      
      const expectedExp = payload.iat + (30 * 24 * 60 * 60);
      expect(Math.abs(payload.exp - expectedExp)).toBeLessThan(2);
    });
  });

  describe('createHeader', () => {
    it('should create valid JWT header', () => {
      const generator = new AppleJWTGenerator(validConfig);
      const header = generator['createHeader']();
      
      expect(header.alg).toBe('ES256');
      expect(header.kid).toBe('MOCK_KEY_ID_123');
    });

    it('should use custom algorithm', () => {
      const config = { ...validConfig, algorithm: 'ES384' };
      const generator = new AppleJWTGenerator(config);
      const header = generator['createHeader']();
      
      expect(header.alg).toBe('ES384');
    });
  });

  describe('validateConfig', () => {
    it('should pass validation for valid config', () => {
      expect(() => AppleJWTGenerator.validateConfig(validConfig)).not.toThrow();
    });

    it('should throw error for missing keyId', () => {
      const config = { ...validConfig };
      delete config.keyId;
      expect(() => AppleJWTGenerator.validateConfig(config)).toThrow('Apple Key ID is required');
    });

    it('should throw error for missing teamId', () => {
      const config = { ...validConfig };
      delete config.teamId;
      expect(() => AppleJWTGenerator.validateConfig(config)).toThrow('Apple Team ID is required');
    });

    it('should throw error for missing privateKey', () => {
      const config = { ...validConfig };
      delete config.privateKey;
      expect(() => AppleJWTGenerator.validateConfig(config)).toThrow('Private key is required');
    });

    it('should throw error for invalid expiration days', () => {
      expect(() => AppleJWTGenerator.validateConfig({ ...validConfig, expiresIn: 0 }))
        .toThrow('Expiration days must be between 1 and 365');
      
      expect(() => AppleJWTGenerator.validateConfig({ ...validConfig, expiresIn: 400 }))
        .toThrow('Expiration days must be between 1 and 365');
    });
  });

  describe('generate', () => {
    it('should generate a JWT token', () => {
      const mockJwtSign = vi.mocked(jwt.sign);
      mockJwtSign.mockReturnValue('mock.jwt.token');

      const generator = new AppleJWTGenerator(validConfig);
      const token = generator.generate();
      
      expect(mockJwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: 'MOCK_TEAM_ID_456',
          iat: expect.any(Number),
          exp: expect.any(Number)
        }),
        mockPrivateKey,
        expect.objectContaining({
          algorithm: 'ES256',
          header: expect.objectContaining({
            alg: 'ES256',
            kid: 'MOCK_KEY_ID_123'
          })
        })
      );
      expect(token).toBe('mock.jwt.token');
    });

    it('should throw error when JWT generation fails', () => {
      const mockJwtSign = vi.mocked(jwt.sign);
      mockJwtSign.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      const generator = new AppleJWTGenerator(validConfig);
      
      expect(() => generator.generate()).toThrow('JWT generation failed: Invalid private key');
    });
  });

  describe('generateAppleJWT function', () => {
    it('should validate config and generate JWT', () => {
      const mockJwtSign = vi.mocked(jwt.sign);
      mockJwtSign.mockReturnValue('mock.jwt.token');

      const token = generateAppleJWT(validConfig);
      
      expect(token).toBe('mock.jwt.token');
      expect(mockJwtSign).toHaveBeenCalled();
    });

    it('should throw error for invalid config', () => {
      const invalidConfig = { ...validConfig };
      delete invalidConfig.keyId;
      
      expect(() => generateAppleJWT(invalidConfig as any)).toThrow('Apple Key ID is required');
    });
  });
});