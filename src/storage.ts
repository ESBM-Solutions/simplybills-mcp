import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * Tiny on-disk store under ~/.simplybills/<hash-of-server-url>/. Holds the
 * dynamically-registered OAuth client, the issued tokens, and the loopback
 * port. Keyed per server URL so connecting to several servers never collides.
 * Files are written 0600; the directory 0700.
 */
const BASE = join(homedir(), ".simplybills");

function dirFor(serverUrl: string): string {
  const key = createHash("sha256").update(serverUrl).digest("hex").slice(0, 16);
  return join(BASE, key);
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function writeJson(file: string, data: unknown): void {
  writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export interface Store {
  readClient(): OAuthClientInformationFull | undefined;
  writeClient(info: OAuthClientInformationFull): void;
  readTokens(): OAuthTokens | undefined;
  writeTokens(tokens: OAuthTokens): void;
  readPort(): number | undefined;
  writePort(port: number): void;
  clear(scope: "all" | "client" | "tokens"): void;
}

export function createStore(serverUrl: string): Store {
  const dir = dirFor(serverUrl);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const clientFile = join(dir, "client.json");
  const tokensFile = join(dir, "tokens.json");
  const portFile = join(dir, "port.json");

  const remove = (file: string) => {
    try {
      rmSync(file);
    } catch {
      // already gone
    }
  };

  return {
    readClient: () => readJson<OAuthClientInformationFull>(clientFile),
    writeClient: (info) => writeJson(clientFile, info),
    readTokens: () => readJson<OAuthTokens>(tokensFile),
    writeTokens: (tokens) => writeJson(tokensFile, tokens),
    readPort: () => readJson<{ port: number }>(portFile)?.port,
    writePort: (port) => writeJson(portFile, { port }),
    clear: (scope) => {
      if (scope === "all" || scope === "tokens") remove(tokensFile);
      if (scope === "all" || scope === "client") remove(clientFile);
    },
  };
}
