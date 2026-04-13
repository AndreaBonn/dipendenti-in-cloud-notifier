# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainer directly with details of the vulnerability
3. Include steps to reproduce and potential impact
4. Allow reasonable time for a fix before public disclosure

## Security Design

This extension follows security best practices:

- **Zero runtime dependencies** — no supply chain attack surface
- **Strict CSP** — `script-src 'self'`, no `eval()` or inline scripts
- **Minimal permissions** — only `activeTab`, `notifications`, `storage`, `offscreen`
- **Host-restricted** — only activates on `secure.dipendentincloud.it`
- **Origin validation** — all message handlers verify `sender.id === chrome.runtime.id`
- **No remote code** — all code is bundled locally, no CDN or external scripts
- **Safe DOM manipulation** — `textContent` and `createElement` only, never `innerHTML`
- **Input sanitization** — sound types validated against whitelist, volumes clamped
- **URL sanitization** — query strings stripped before storage to prevent token leakage

## Data Handling

- All data is stored locally in `chrome.storage.local`
- No data is transmitted to external servers
- No analytics or telemetry
- No user credentials are stored or processed
