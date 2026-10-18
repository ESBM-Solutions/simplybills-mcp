# simplybills-mcp

Connect ChatGPT, Claude or any MCP-capable client to your [SimplyBills](https://simplybills.de) account. Your own AI can then read your data and create invoices, quotes, customers and expenses, and (on the Max plan) send and delete documents. Every send or delete asks you for confirmation first.

SimplyBills runs a remote MCP server at:

```
https://app.simplybills.de/api/mcp
```

It uses OAuth: you log in once in your browser and allow access, no tokens to copy. Clients that support remote MCP servers connect to it directly, so there is nothing to install.

This repository also contains a small local bridge (stdio) for clients that can only launch a local command. Most people do not need it. See [Local bridge](#local-bridge-for-stdio-only-clients) below.

> Requires a SimplyBills account on the Pro or Max plan. The KI-Schnittstelle (MCP) is included there. Step-by-step guide with screenshots (German): [simplybills.de/ki-schnittstelle/anleitung](https://simplybills.de/ki-schnittstelle/anleitung).

## What your AI can do

- Read invoices, quotes, cancellations, customers, company data and expenses
- Create and update drafts: invoices, quotes, customers, expenses (Pro and Max)
- Send invoices, quotes and reminders, and delete documents (Max only, always with your confirmation)
- Find overdue invoices and draft reminders (the payment-coach flow)

Amounts, tax and the running invoice number are calculated by SimplyBills, so the AI cannot miscalculate them.

## Setup

### Claude (claude.ai and the Claude apps)

1. Open claude.ai, go to Customize, then Connectors.
2. Under Add, choose "Add custom connector".
3. Enter `SimplyBills` as the name and `https://app.simplybills.de/api/mcp` as the URL, then continue.
4. Log in to SimplyBills and allow access.

A custom connector also works on the free Claude plan.

### ChatGPT

1. Open [chatgpt.com/plugins](https://chatgpt.com/plugins), click Add, then "Add custom MCP server".
2. Enter `SimplyBills` as the name and `https://app.simplybills.de/api/mcp` as the server URL. Leave authentication on OAuth.
3. Log in to SimplyBills and allow access.

As far as we know, custom MCP servers need a paid ChatGPT plan.

### Claude Code

```bash
claude mcp add --transport http --scope user simplybills https://app.simplybills.de/api/mcp
```

Then type `/mcp` in Claude Code, select SimplyBills and log in. If you already connected SimplyBills on claude.ai, it is available in Claude Code with the same Claude account.

### Codex

```bash
codex mcp add simplybills --url https://app.simplybills.de/api/mcp
codex mcp login simplybills
```

The second command opens the login in your browser. The Codex app and editor extension use the same configuration.

### Other clients

If your client can add a remote MCP server by URL (Streamable HTTP with OAuth), point it at `https://app.simplybills.de/api/mcp` and follow the login.

## Local bridge for stdio-only clients

Only needed for clients that cannot connect to a remote MCP server and can only launch a local command. The bridge runs as a local MCP server and forwards everything to `https://app.simplybills.de/api/mcp` over an authenticated connection.

> The bridge is not published on npm yet, so `npx simplybills-mcp` does not work. Build it from source for now.

```bash
git clone https://github.com/ESBM-Solutions/simplybills-mcp.git
cd simplybills-mcp
npm install
npm run build
```

Then add it to your client's MCP configuration, using the absolute path to `dist/index.js`:

```json
{
  "mcpServers": {
    "simplybills": {
      "command": "node",
      "args": ["/absolute/path/to/simplybills-mcp/dist/index.js"]
    }
  }
}
```

Restart the client. On first use a browser window opens, you log in to SimplyBills and allow access.

### How the login works

On first run the bridge:

1. registers itself with SimplyBills (OAuth 2.1 Dynamic Client Registration, a public PKCE client, no secret),
2. opens your browser to the SimplyBills consent screen,
3. catches the redirect on a local loopback address,
4. stores the resulting tokens under `~/.simplybills/`.

After that it reuses and refreshes those tokens silently. You never paste credentials, and the AI only ever receives a short-lived token bound to your account, which you can revoke any time under Einstellungen, KI-Schnittstelle.

### Configuration

Environment variables, all optional:

- `SIMPLYBILLS_MCP_URL` overrides the server URL (default `https://app.simplybills.de/api/mcp`). Useful for local development.
- `SIMPLYBILLS_SCOPE` overrides the requested scopes (default `read write send delete`). The server only grants what your plan permits: Pro gets `read` and `write`, Max also gets `send` and `delete`.

You can also pass the server URL as the first argument:

```json
{ "command": "node", "args": ["/absolute/path/to/simplybills-mcp/dist/index.js", "http://localhost:3001/api/mcp"] }
```

## Security

- The connection uses OAuth 2.1 with PKCE (S256) and is audience-bound to the SimplyBills MCP endpoint.
- Sending and deleting always require a confirmation step that the AI must surface to you before it runs.
- Revoke any connected AI at any time in SimplyBills under Einstellungen, KI-Schnittstelle.
- The local bridge stores its tokens under `~/.simplybills/` (files `0600`), never in the config you share.

## Development

```bash
npm install
npm run build      # tsc -> dist/
SIMPLYBILLS_MCP_URL=http://localhost:3001/api/mcp node dist/index.js
```

## License

MIT
