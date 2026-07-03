import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createApiApp } from "./api.js";
import { RateLimiter } from "./rate-limit.js";
import { createSmtpServer } from "./smtp.js";
import { Store } from "./store.js";

const config = loadConfig();
const store = new Store(config);
const limiter = new RateLimiter(config);
const apiApp = createApiApp(store, limiter);
const smtpServer = createSmtpServer(config, store);

const httpServer = serve(
  {
    fetch: apiApp.fetch,
    port: config.port,
  },
  (info) => {
    console.error(`[http] listening on port ${info.port}`);
  },
);

smtpServer.listen(config.smtpPort, () => {
  console.error(`[smtp] listening on port ${config.smtpPort}`);
});

function shutdown(signal: string): void {
  console.error(`[server] received ${signal}, shutting down`);

  store.stop();
  limiter.stop();

  httpServer.close(() => {
    smtpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
