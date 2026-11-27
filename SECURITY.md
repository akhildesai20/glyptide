# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes (public preview) |

## Reporting a vulnerability

Please report security issues **privately** via GitHub Security Advisories for this repository, or by emailing the maintainer listed on the GitHub profile for `akhildesai20`.

Do **not** open a public issue for unfixed vulnerabilities.

Include:

- Affected package (`glyptide` and/or `@glyptide/react`) and version
- A minimal reproduction
- Impact assessment (XSS, prototype pollution, supply-chain, etc.)

## Scope notes

Glyptide is a **presentation layer**. It does not call model APIs and should not receive provider secrets in the browser. Keep API keys on the server; pass only text chunks into the client.

Model text is inserted as text nodes — never as unsanitized HTML and never via `eval`.
