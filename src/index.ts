#!/usr/bin/env node
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { createStore } from "./storage.js";
import { startCallbackServer, type CallbackServer } from "./callback-server.js";
import { NodeOAuthClientProvider } from "./oauth-provider.js";
import { mcpProxy } from "./proxy.js";
import { log } from "./log.js";

const DEFAULT_URL = "https://app.simplybills.de/api/mcp";
const DEFAULT_PORT = 33765;
const DEFAULT_SCOPE = "read write send delete";

async function authenticate(
  provider: NodeOAuthClientProvider,
  serverUrl: string,
  callback: CallbackServer,
): Promise<void> {
  // First pass: reuses cached tokens, refreshes if possible, or (if login is
  // needed) registers the client, opens the browser, and returns "REDIRECT".
  const result = await auth(provider, { serverUrl });
  if (result === "AUTHORIZED") return;

  log("Warte auf Anmeldung im Browser ...");
  const { code } = await callback.waitForCode();
  const finished = await auth(provider, { serverUrl, authorizationCode: code });
  if (finished !== "AUTHORIZED") {
    throw new Error("Authentifizierung fehlgeschlagen.");
  }
  log("Anmeldung erfolgreich.");
}

async function main(): Promise<void> {
  const serverUrl =
    process.argv[2] || process.env.SIMPLYBILLS_MCP_URL || DEFAULT_URL;
  const scope = process.env.SIMPLYBILLS_SCOPE || DEFAULT_SCOPE;
  const store = createStore(serverUrl);

  // The loopback port is part of the registered redirect_uri, so it must be
  // stable across runs. Prefer the persisted port; if it is taken, take a new
  // one and drop the old client registration so it is re-created to match.
  const persistedPort = store.readPort();
  const callback = await startCallbackServer(persistedPort ?? DEFAULT_PORT);
  if (persistedPort !== undefined && callback.port !== persistedPort) {
    store.clear("client");
  }
  store.writePort(callback.port);

  const provider = new NodeOAuthClientProvider(store, {
    redirectUrl: `http://127.0.0.1:${callback.port}/callback`,
    clientName: "SimplyBills MCP (CLI)",
    scope,
  });

  await authenticate(provider, serverUrl, callback);

  // Note: StreamableHTTPClientTransport.start() does not contact the server or
  // trigger auth (the first POST would). We authenticated above, so tokens are
  // already cached and the transport picks them up.
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    authProvider: provider,
  });
  const stdio = new StdioServerTransport();
  mcpProxy(stdio, transport);

  await transport.start();
  await stdio.start();
  log(`Verbunden mit ${serverUrl}. Bereit.`);

  const shutdown = () => {
    callback.close();
    transport.close().catch(() => {});
    stdio.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  if (err instanceof UnauthorizedError) {
    log("Authentifizierung erforderlich. Bitte starte den Connector erneut.");
  }
  log("Fehler:", err?.stack ?? String(err));
  process.exit(1);
});
