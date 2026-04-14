# Security Policy

> **English** | [Italiano](SECURITY.it.md)
>
> Back to [README](README.md)

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue.
2. Email the maintainer directly with details of the vulnerability.
3. Include steps to reproduce and potential impact.
4. Allow reasonable time for a fix before public disclosure.

## Security Design

This extension follows security best practices:

- **Zero runtime dependencies** -- no supply chain attack surface.
- **Strict Content Security Policy** -- `default-src 'none'; script-src 'self'`. No `eval()`, no inline scripts.
- **Minimal permissions** -- only `storage`, `notifications`, `offscreen`, and `alarms`. Host access restricted to `dipendentincloud.it` subdomains.
- **Origin validation** -- all message handlers verify `sender.id === chrome.runtime.id` and validate the tab URL against an allowlist using the `URL` parser (not regex).
- **Action whitelist** -- message handlers only accept known actions via `VALID_ACTIONS`.
- **No remote code** -- all code is bundled locally. No CDN, no external scripts, `connect-src 'none'`.
- **Safe DOM manipulation** -- `textContent` and `createElement` only, never `innerHTML`.
- **Input sanitization** -- sound types validated against a whitelist, volumes clamped to valid ranges, descriptions truncated.
- **URL sanitization** -- query strings stripped before storage to prevent session token leakage.

## Data Handling

- All data is stored locally in `chrome.storage.local`.
- No data is transmitted to external servers.
- No analytics, telemetry, or tracking.
- No user credentials are stored or processed.
