# Apple JWT Generator

A CLI tool to generate Apple JWT for authentication with Apple services. Use interactively or in automation/scripts.

## Features

- Generate Apple JWT tokens with ES256 algorithm
- Interactive prompts for manual use
- Command-line arguments for scripting
- Environment variables for CI/CD and automation
- Works with private key files or inline content

## Usage

### Quick Start

```bash
npx @jimmyclchu/apple-jwt
```

### Command Line Mode

Provide all arguments directly:

```bash
npx @jimmyclchu/apple-jwt -k YOUR_KEY_ID -t YOUR_TEAM_ID -p ./private-key.pem
```

### Options

- `-k, --key-id` - Apple Key ID (required)
- `-t, --team-id` - Apple Team ID (required)  
- `-p, --private-key` - Private key file path or content (required)
- `-e, --expires-in` - Expiration in days (default: 180)
- `-o, --output` - Save to file instead of printing

## Automation

```bash
# Set environment variables
export APPLE_KEY_ID="your_key_id"
export APPLE_TEAM_ID="your_team_id"
export APPLE_PRIVATE_KEY_PATH="./private-key.pem"

# Tool runs automatically without prompts
npx @jimmyclchu/apple-jwt -o token.jwt
```

### GitHub Actions
```yaml
- name: Generate Apple JWT
  env:
    APPLE_KEY_ID: ${{ secrets.APPLE_KEY_ID }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    APPLE_PRIVATE_KEY: ${{ secrets.APPLE_PRIVATE_KEY }}
  run: npx @jimmyclchu/apple-jwt -o apple-token.jwt
```

### Node.js Script
```javascript
// generate-token.js
process.env.APPLE_KEY_ID = "your_key_id";
process.env.APPLE_TEAM_ID = "your_team_id";
process.env.APPLE_PRIVATE_KEY_PATH = "./apple-key.pem";

const { exec } = require('child_process');
exec('npx @jimmyclchu/apple-jwt -o token.jwt', (error, stdout) => {
  if (error) throw error;
  console.log('Token generated:', stdout);
});
```

## Development

### CI/CD Pipeline

This project uses GitHub Actions for:
- **CI**: Automated testing on Node.js 18.x, 20.x, 22.x
- **Release**: Automated npm publishing on git tags
- **PR Validation**: Full test suite and security audits

### Release Process

1. Create a new tag: `git tag v1.0.1`
2. Push the tag: `git push origin v1.0.1`
3. GitHub Actions will automatically build, test, and publish to npm

## License

MIT
