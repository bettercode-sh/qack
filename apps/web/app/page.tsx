const commands = [
  [
    "create",
    "Create a throwaway inbox. Prints the email address to stdout. Use --realistic for human-looking addresses.",
  ],
  ["wait", "Block until the next message arrives. Use this for OTPs and links."],
  ["list", "List message IDs, senders, subjects, and timestamps."],
  ["get", "Fetch a message body as text, HTML, raw RFC 822, or JSON."],
  ["delete", "Delete an inbox and every message it received."],
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="eyebrow">Qack.dev</div>
        <h1 id="hero-title">Disposable email inboxes for CI.</h1>
        <p className="hero-copy">
          Create a temporary `@qack.dev` address, point your app-under-test at it,
          and let your pipeline wait for verification emails, OTPs, and magic links.
          The CLI uses <code>api.qack.dev</code> by default; self-host when you need
          a private instance.
        </p>
        <div className="actions" aria-label="Primary actions">
          <a href="#quickstart">Quickstart</a>
          <a href="/llms.txt">llms.txt</a>
        </div>
      </section>

      <section id="quickstart" className="panel" aria-labelledby="quickstart-title">
        <div>
          <p className="section-label">Start here</p>
          <h2 id="quickstart-title">Three commands.</h2>
        </div>
        <pre>
          <code>{`# Create an inbox (use --realistic when signup filters reject random addresses)
ADDR=$(npx qack-mail create --realistic)

# Trigger your signup, reset, or invite flow with $ADDR
curl -X POST https://your-app.test/signup -d "email=$ADDR"

# Wait for the email body, then extract what your test needs
BODY=$(npx qack-mail wait "$ADDR" --timeout 300)
OTP=$(echo "$BODY" | grep -oE '[0-9]{6}' | head -1)`}</code>
        </pre>
      </section>

      <section className="grid" aria-label="Developer details">
        <div className="panel">
          <p className="section-label">CLI</p>
          <h2>What you can run</h2>
          <dl className="command-list">
            {commands.map(([name, description]) => (
              <div key={name}>
                <dt>qack-mail {name}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
          <p className="note">
            Add <code>--json</code> for structured stdout. The default API is{" "}
            <code>https://api.qack.dev</code>. Set <code>QACK_API_URL</code> or pass{" "}
            <code>--api-url</code> to point at a self-hosted server.
          </p>
        </div>

        <div className="panel">
          <p className="section-label">API</p>
          <h2>Plain HTTP underneath</h2>
          <pre>
            <code>{`POST   /v1/inboxes              { "realistic": true }
GET    /v1/inboxes/:address/messages
GET    /v1/inboxes/:address/messages/:id
GET    /v1/inboxes/:address/messages/wait
DELETE /v1/inboxes/:address`}</code>
          </pre>
          <p className="note">
            Messages include <code>text</code>, <code>html</code>, headers, raw
            source, and stable IDs. Inboxes expire by default after 60 minutes.
            Pass <code>--realistic</code> or <code>{`{ "realistic": true }`}</code>{" "}
            when an app blocks obviously random disposable addresses.
          </p>
        </div>
      </section>

      <section className="panel split" aria-labelledby="ci-title">
        <div>
          <p className="section-label">CI example</p>
          <h2 id="ci-title">Use it in GitHub Actions.</h2>
          <p>
            Qack is designed for tests that need to receive mail without wiring
            a real inbox into automation.
          </p>
        </div>
        <pre>
          <code>{`- name: Create test inbox
  run: echo "TEST_EMAIL=$(npx qack-mail create --realistic)" >> $GITHUB_ENV

- name: Wait for verification email
  run: |
    BODY=$(npx qack-mail wait "$TEST_EMAIL" --timeout 300)
    OTP=$(echo "$BODY" | grep -oE '[0-9]{6}' | head -1)
    echo "OTP=$OTP" >> $GITHUB_ENV`}</code>
        </pre>
      </section>

      <footer>
        <span>Open source (MIT). Temporary by design. CLI-first.</span>
        <nav aria-label="Footer links">
          <a href="https://github.com/bettercode-sh/qack">Source</a>
          <a href="https://github.com/bettercode-sh/qack/blob/main/ACCEPTABLE_USE.md">
            Acceptable use
          </a>
          <a href="https://github.com/bettercode-sh/qack/blob/main/SECURITY.md">Security</a>
          <a href="/llms.txt">llms.txt</a>
        </nav>
      </footer>
    </main>
  );
}
