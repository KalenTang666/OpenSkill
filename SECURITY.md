# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenSkill, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email: security@dnadance.cn (or open a private security advisory on GitHub)
3. Include: description, steps to reproduce, impact assessment
4. We will respond within 48 hours

## Security Design Principles

OpenSkill is built with security at its core:

- **Local-first**: All data stored on your filesystem by default
- **No telemetry**: Zero data sent to any server without explicit opt-in
- **Signed assets**: Every asset change is signed for audit trail
- **Sandbox validation**: Imported skills run in isolation before entering the wallet
- **Minimal permissions**: Each adapter gets only the access it needs

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Current |
