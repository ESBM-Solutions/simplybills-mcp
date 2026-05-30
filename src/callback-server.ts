import { createServer, type Server } from "node:http";

export interface CallbackServer {
  port: number;
  /** Resolves with the next authorization code delivered to /callback. */
  waitForCode(): Promise<{ code: string; state: string | null }>;
  close(): void;
}

type Payload = { code: string; state: string | null };

/**
 * A loopback HTTP server that catches the OAuth redirect. It stays up for the
 * whole process so a token refresh that needs a fresh browser login (after the
 * refresh token finally expires) can be handled without a restart.
 */
export async function startCallbackServer(
  preferredPort: number,
): Promise<CallbackServer> {
  let resolveNext: ((p: Payload) => void) | null = null;
  const queued: Payload[] = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end("Not found");
      return;
    }
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });

    if (error) {
      res.end(page("Verbindung abgelehnt", "Du kannst dieses Fenster schließen."));
      return;
    }
    if (!code) {
      res.end(page("Es fehlt etwas", "Es wurde kein Anmeldecode empfangen."));
      return;
    }
    res.end(
      page(
        "Verbunden mit SimplyBills",
        "Du kannst dieses Fenster schließen und zu deiner KI zurückkehren.",
      ),
    );
    const payload: Payload = { code, state };
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve(payload);
    } else {
      queued.push(payload);
    }
  });

  const port = await listen(server, preferredPort);

  return {
    port,
    waitForCode: () =>
      new Promise<Payload>((resolve) => {
        const next = queued.shift();
        if (next) resolve(next);
        else resolveNext = resolve;
      }),
    close: () => server.close(),
  };
}

function listen(server: Server, preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const attempt = (port: number, triesLeft: number) => {
      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && triesLeft > 0) {
          attempt(port + 1, triesLeft - 1);
        } else {
          reject(err);
        }
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onError);
        const addr = server.address();
        resolve(typeof addr === "object" && addr ? addr.port : port);
      });
    };
    attempt(preferredPort, 10);
  });
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8fafc;color:#0f172a}.card{max-width:28rem;padding:2rem;text-align:center}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#475569;margin:0;line-height:1.5}</style></head><body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
}
