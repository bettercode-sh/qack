# Qack.dev

Temporary email testing for CI/CD pipelines. Create a throwaway inbox like `f3k9x2@qack.dev`, point your app-under-test at it, and use the CLI to wait for OTPs, verification links, and other inbound mail.

The hosted API at **`https://api.qack.dev`** is the default for `qack-mail`. You can also [self-host](#self-hosting) the same open-source server on your own domain.

## Quickstart

```bash
# Create an inbox (prints address to stdout)
ADDR=$(npx qack-mail create)

# Use --realistic when your app's signup filters reject random-looking addresses
ADDR=$(npx qack-mail create --realistic)

# Wait for the next message (blocks up to 5 minutes by default)
npx qack-mail wait "$ADDR"

# Or extract an OTP in CI
OTP=$(npx qack-mail wait "$ADDR" --timeout 120 | grep -oE '[0-9]{6}')
```

### CI example (GitHub Actions)

```yaml
- name: Create test inbox
  run: echo "TEST_EMAIL=$(npx qack-mail create --realistic)" >> $GITHUB_ENV

- name: Trigger signup
  run: curl -X POST https://myapp.com/signup -d "email=${{ env.TEST_EMAIL }}"

- name: Wait for verification email and extract OTP
  run: |
    BODY=$(npx qack-mail wait "${{ env.TEST_EMAIL }}" --timeout 300)
    OTP=$(echo "$BODY" | grep -oE '[0-9]{6}' | head -1)
    echo "OTP=$OTP" >> $GITHUB_ENV
```

All commands support `--json` for structured output. Errors go to stderr; machine-readable results go to stdout.

## Commands

| Command | Description |
|---------|-------------|
| `qack-mail create [--name <name>] [--realistic]` | Create an inbox (default: random address; `--realistic` for human-looking names) |
| `qack-mail list <address>` | List message summaries |
| `qack-mail get <address> <id> [--text\|--html\|--raw]` | Fetch a full message |
| `qack-mail wait <address> [--timeout <sec>] [--since <id>]` | Block until a new message arrives |
| `qack-mail delete <address>` | Delete an inbox |

Exit codes: `0` success, `1` error, `2` timeout (`wait` only).

## Configuration

| Variable | Where | Default | Description |
|----------|-------|---------|-------------|
| `QACK_API_URL` | CLI | `https://api.qack.dev` | API base URL |
| `--api-url` | CLI flag | (same) | Overrides `QACK_API_URL` |

For local development against a running server:

```bash
export QACK_API_URL=http://localhost:8080
pnpm --filter @qack/server dev   # terminal 1
pnpm --filter qack-mail build && node apps/cli/dist/index.js create
```

## Monorepo layout

- **`apps/cli`** (`qack-mail`) — npm-published CLI
- **`apps/server`** — Inbound SMTP + HTTP API (in-memory storage)
- **`apps/web`** — Landing page and static docs
- **`packages/shared`** — Shared TypeScript API types

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Hosted service

`qack-mail` talks to **`https://api.qack.dev`** by default. No API key is required in v1.

- Inboxes expire after 60 minutes (configurable on self-hosted deployments).
- Message bodies are stored in memory on a single server — not durable across restarts.
- Anyone who knows an inbox address can read its messages. Use only for automated testing, not personal mail.

## Self-hosting

The server is a single Node process with in-memory storage. Deploy to Fly.io (see [apps/server/README.md](apps/server/README.md)) or run locally with `pnpm --filter @qack/server dev`.

Point the CLI at your instance:

```bash
export QACK_API_URL=https://api.your-domain.test
npx qack-mail create
```

**Constraints for production:**

- Exactly **one** machine — state is not shared across instances or restarts
- Inbound SMTP on port 25 requires a **dedicated IPv4** on Fly.io
- Point your MX record at the mail server's IP and the API at `api.<your-domain>`

Messages expire with their inbox (default 60 minutes). No authentication in v1 — restrict network access when self-hosting on a private network.

## Acceptable use

Qack is for **testing applications you own or are authorized to test** — not for spam, phishing, or bypassing third-party fraud controls.

See [ACCEPTABLE_USE.md](ACCEPTABLE_USE.md) for the full policy.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities and what is in scope.

## License

MIT — see [LICENSE](LICENSE).
