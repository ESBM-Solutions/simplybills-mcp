import { randomBytes } from "node:crypto";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientMetadata,
  OAuthClientInformationFull,
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Store } from "./storage.js";
import { openBrowser } from "./browser.js";
import { log } from "./log.js";

/**
 * Node implementation of the MCP SDK's OAuthClientProvider. It persists the
 * dynamically-registered client and tokens via the Store, keeps the PKCE
 * verifier in memory for the current process, and opens the system browser
 * when the server requires interactive login.
 */
export class NodeOAuthClientProvider implements OAuthClientProvider {
  private verifier: string | undefined;
  private _state: string | undefined;

  constructor(
    private readonly store: Store,
    private readonly opts: {
      redirectUrl: string;
      clientName: string;
      scope: string;
    },
  ) {}

  get redirectUrl(): string {
    return this.opts.redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: this.opts.clientName,
      redirect_uris: [this.opts.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: this.opts.scope,
    };
  }

  state(): string {
    if (!this._state) this._state = randomBytes(16).toString("hex");
    return this._state;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this.store.readClient();
  }

  saveClientInformation(info: OAuthClientInformationFull): void {
    this.store.writeClient(info);
  }

  tokens(): OAuthTokens | undefined {
    return this.store.readTokens();
  }

  saveTokens(tokens: OAuthTokens): void {
    this.store.writeTokens(tokens);
  }

  saveCodeVerifier(verifier: string): void {
    this.verifier = verifier;
  }

  codeVerifier(): string {
    if (!this.verifier) throw new Error("Kein PKCE code_verifier vorhanden.");
    return this.verifier;
  }

  redirectToAuthorization(url: URL): void {
    log("Zum Anmelden öffnet sich dein Browser. Falls nicht, öffne diese Adresse:");
    log(url.toString());
    openBrowser(url.toString());
  }

  invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): void {
    if (scope === "verifier") {
      this.verifier = undefined;
      return;
    }
    if (scope === "discovery") return;
    this.store.clear(scope);
  }
}
