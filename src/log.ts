/**
 * All diagnostics go to stderr. stdout is reserved for the MCP JSON-RPC
 * stream that the client reads, so writing anything else there corrupts it.
 */
const PREFIX = "[simplybills-mcp]";

export function log(...parts: unknown[]): void {
  process.stderr.write(`${PREFIX} ${parts.map((p) => String(p)).join(" ")}\n`);
}
