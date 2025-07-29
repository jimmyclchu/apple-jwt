export interface JWTConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  expiresIn?: number;
  algorithm?: string;
}

export interface ConfigFile {
  keyId?: string;
  teamId?: string;
  privateKeyPath?: string;
  expiresIn?: number;
  algorithm?: string;
}

export interface CLIOptions {
  keyId?: string;
  teamId?: string;
  privateKey?: string;
  expiresIn?: number;
  algorithm?: string;
  output?: string;
  help?: boolean;
  version?: boolean;
}

export interface InteractivePrompts {
  keyId: string;
  teamId: string;
  privateKey: string;
  expiresIn: string;
  algorithm: string;
}

export interface JWTPayload {
  iss: string;  // teamId
  iat: number;  // issued at
  exp: number;  // expires at
}

export interface JWTHeader {
  alg: string;  // algorithm
  kid: string;  // keyId
}