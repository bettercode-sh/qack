# Security Policy

## Supported versions

Security fixes are applied to the latest release on the default branch. There is no long-term support matrix for older versions.

| Version | Supported |
| ------- | --------- |
| latest on `main` | yes |
| older tags / forks | no |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email security reports to **security@qack.dev**. If that address is not yet active, open a private security advisory on GitHub instead.

Include:

- A clear description of the issue and its impact
- Steps to reproduce, or proof-of-concept if available
- Which component is affected (`apps/server`, `apps/cli`, hosted `api.qack.dev`, etc.)
- Your contact information for follow-up

We aim to acknowledge reports within a few business days.

## Scope

**In scope**

- Remote code execution, authentication bypass, or privilege escalation in the server or CLI
- Open SMTP relay or other misconfiguration that allows delivering mail to arbitrary domains
- Data exposure across inboxes (reading another user's messages without their address)
- Denial-of-service issues that can take down a single-node deployment with modest resources

**Out of scope**

- Abuse of the service for spam, fraud, or bypassing third-party signup filters — see [Acceptable Use](ACCEPTABLE_USE.md)
- Lack of API authentication on v1 (documented; use self-hosting with network restrictions if you need isolation)
- Inbox contents being readable by anyone who knows the address (by design for disposable CI inboxes)
- Messages or inboxes lost on restart, TTL expiry, or single-machine limits (documented operational constraints)
- Social engineering, physical access, or issues in third-party mail providers sending mail to Qack

## Hosted service (`api.qack.dev`)

The public API at `https://api.qack.dev` runs the same open-source server. It is intended for **automated testing**, not for personal or production mail.

- Inboxes and message bodies are held **in memory** and expire (default 60 minutes).
- There is **no authentication** in v1; anyone who knows an inbox address can read its messages.
- Do not send sensitive personal, financial, or healthcare data to `@qack.dev` addresses.
- We may rate-limit or block abusive traffic on the hosted instance without notice.

For private or regulated workloads, [self-host](README.md#self-hosting) the server on your own network.

## Self-hosting

If you deploy `@qack/server` yourself:

- Restrict HTTP API access to trusted networks when possible.
- Run **exactly one** machine unless you add external storage (state is in-process memory).
- Keep Node.js and dependencies updated.
- Point inbound SMTP only at domains you control.

## Safe disclosure

We appreciate responsible disclosure. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations and service disruption
- Do not access other users' inboxes beyond what is needed to demonstrate the issue
- Give us reasonable time to fix the issue before public disclosure
