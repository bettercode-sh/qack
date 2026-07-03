# Acceptable Use

Qack.dev provides **temporary email inboxes for automated testing** — primarily CI/CD pipelines, integration tests, and staging environments where you need to receive verification emails, OTPs, or magic links without wiring up a real mailbox.

By using the hosted service at `api.qack.dev`, the `qack-mail` CLI pointed at that API, or any `@qack.dev` address, you agree to this policy.

## Allowed uses

- End-to-end and integration tests for **applications you own or are authorized to test**
- Staging and QA flows in controlled environments
- Local development against the hosted API or a self-hosted instance
- Self-hosting the open-source server for your team or organization
- Using `--realistic` / `{ "realistic": true }` to generate human-looking addresses when **your own app's** signup validation rejects obviously random disposable addresses during testing

## Prohibited uses

Do **not** use Qack to:

- Send spam, phishing, malware, or unsolicited bulk email
- Impersonate people or organizations
- Bypass fraud, abuse, or security controls on **third-party services** you do not own or have written permission to test
- Harvest, store, or redistribute mail intended for other people
- Register accounts on consumer services for harassment, ban evasion, or credential stuffing
- Handle regulated or highly sensitive data (financial, health, government ID, etc.) — inboxes are unauthenticated and short-lived
- Operate the hosted `api.qack.dev` instance as a general-purpose email provider for end users
- Run load tests or denial-of-service attacks against the hosted service

## Hosted service vs self-hosting

| | Hosted (`api.qack.dev`) | Self-hosted |
| --- | --- | --- |
| **Purpose** | Default, shared testing API | Private deployments, custom domains, network isolation |
| **Data** | In-memory, expires (~60 min), may be lost on restart | You control retention and access |
| **Abuse** | We may rate-limit or block traffic | Your responsibility |
| **Auth** | None in v1 | You can restrict by network/firewall |

The CLI defaults to `https://api.qack.dev`. Override with `QACK_API_URL` or `--api-url` when using your own server.

## `--realistic` addresses

The `--realistic` flag generates local-parts that look like real names (for example `jane.smith42@qack.dev`). This exists so **your tests** can exercise signup flows that filter disposable or random-looking addresses.

It is not intended to deceive people or evade abuse detection on services you do not control. Use it only in authorized testing contexts.

## Enforcement

We may, without notice:

- Delete inboxes or block IP ranges on the hosted service
- Refuse service to accounts or traffic that violate this policy
- Cooperate with abuse reports from mail providers or affected services

Self-hosters are responsible for abuse originating from their own deployments, including MX records and outbound reputation.

## Questions

For policy questions, contact **hello@qack.dev**. For security issues, see [SECURITY.md](SECURITY.md).
