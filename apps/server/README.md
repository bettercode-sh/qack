# @qack/server

Inbound SMTP + HTTP API for Qack.dev. One Node process accepts mail for `*@qack.dev` and exposes the REST API the `qack` CLI uses.

## Local development

```bash
pnpm --filter @qack/server dev
```

Defaults: HTTP on `8080`, SMTP on `2525` (non-privileged for local dev).

```bash
# Create an inbox
curl -s -X POST http://localhost:8080/v1/inboxes | jq

# Deliver mail (requires swaks or similar)
swaks --to inbox@qack.dev --from sender@example.com \
  --server localhost:2525 --body 'Hello from CI'
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP API listen port |
| `SMTP_PORT` | `2525` | SMTP listen port (`25` in production via Fly port mapping) |
| `MAIL_DOMAIN` | `qack.dev` | Domain accepted for inbound mail |
| `INBOX_TTL_MINUTES` | `60` | Inbox lifetime before automatic expiry |
| `MAX_MESSAGE_BYTES` | `5242880` | Max raw message size (5 MB) |

## Fly.io deployment

**Machine count must stay at exactly 1.** All inboxes and messages live in process memory. If Fly scales to multiple machines, creates a new machine, or restarts the VM, inboxes are lost. The `fly.toml` disables autostop/autostart and sets `min_machines_running = 1` — do not change these without adding external storage.

### First-time setup

From the **repository root**, pass `--config apps/server/fly.toml` on every `fly` command (or use `-a qack-server`):

```bash
fly launch --no-deploy --config apps/server/fly.toml
fly deploy . --config apps/server/fly.toml
fly ips allocate-v4 --config apps/server/fly.toml
fly certs add api.qack.dev --config apps/server/fly.toml
fly certs show api.qack.dev --config apps/server/fly.toml
```

`fly.toml` lives in `apps/server/`, so `dockerfile = 'Dockerfile'` resolves to `apps/server/Dockerfile`. The `.` on deploy is required so the Docker build can see the root `package.json`, `pnpm-lock.yaml`, and workspace packages.

### DNS

| Record | Value |
|--------|-------|
| `MX` `qack.dev` | `mail.qack.dev` (priority 10) |
| `A` `mail.qack.dev` | dedicated Fly IPv4 from `fly ips list` |
| `CNAME` or `A` `api.qack.dev` | Fly app hostname (`qack-server.fly.dev` or custom cert target) |

SMTP is exposed on external port 25 and forwarded to internal port `2525` (see `[[services]]` in `fly.toml`). The HTTP API is served on `api.qack.dev` with TLS.

### Verify production

```bash
ADDR=$(npx qack-mail create)
npx qack-mail wait "$ADDR" --timeout 300 &
# Send a test email from Gmail to $ADDR, then confirm wait unblocks
```

Unknown recipients should receive SMTP `550` (rejected at RCPT time).
