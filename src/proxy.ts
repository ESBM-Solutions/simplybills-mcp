import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { log } from "./log.js";

/**
 * Transparently pipe every JSON-RPC message between the local stdio client and
 * the remote SimplyBills server, in both directions, and tear both sides down
 * together. No message is interpreted here, so new tools on the server appear
 * automatically without any change to this bridge.
 */
export function mcpProxy(client: Transport, server: Transport): void {
  let clientClosed = false;
  let serverClosed = false;

  client.onmessage = (message) => {
    server.send(message).catch((e) => log("Weiterleitung an Server fehlgeschlagen:", String(e)));
  };
  server.onmessage = (message) => {
    client.send(message).catch((e) => log("Weiterleitung an Client fehlgeschlagen:", String(e)));
  };

  client.onclose = () => {
    if (serverClosed) return;
    clientClosed = true;
    server.close().catch(() => {});
  };
  server.onclose = () => {
    if (clientClosed) return;
    serverClosed = true;
    client.close().catch(() => {});
  };

  client.onerror = (e) => log("Client-Transport-Fehler:", String(e));
  server.onerror = (e) => log("Server-Transport-Fehler:", String(e));
}
