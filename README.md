# Qack.dev

Temporary email testing for CI/CD pipelines. Create a throwaway inbox like `f3k9x2@qack.dev`, point your app-under-test at it, and use the CLI to wait for OTPs, verification links, and other inbound mail.

## Quickstart

```bash
# Create an inbox (prints address to stdout)
ADDR=$(npx qack-mail create)

# Wait for the next message (blocks up to 5 minutes by default)
npx qack-mail wait "$ADDR"

# Or extract an OTP in CI
OTP=$(npx qack-mail wait "$ADDR" --timeout 120 | grep -oE '[0-9]{6}')
```

### CI example (GitHub Actions)

```yaml
- name: Create test inbox
  run: echo "TEST_EMAIL=$(npx qack-mail create)" >> $GITHUB_ENV

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
| `qack-mail create [--name <name>]` | Create an inbox (default: random address) |
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
- **`apps/web`** — Placeholder landing page
- **`packages/shared`** — Shared TypeScript API types

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Self-hosting

The server is a single Node process with in-memory storage. Deploy to Fly.io (see [apps/server/README.md](apps/server/README.md)) or run locally with `pnpm --filter @qack/server dev`.

**Constraints for production:**

- Exactly **one** machine — state is not shared across instances or restarts
- Inbound SMTP on port 25 requires a **dedicated IPv4** on Fly.io
- Point your MX record at the mail server's IP and the API at `api.<your-domain>`

Messages expire with their inbox (default 60 minutes). No authentication in v1 — restrict network access if self-hosting on a private network.

## License

Private / unlicensed (greenfield project).
