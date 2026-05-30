# simplybills-mcp

Connect ChatGPT, Claude or any MCP-capable client to your [SimplyBills](https://simplybills.de) account. Your own AI can then read your data and create invoices, quotes, customers and expenses, and (on the Max plan) send and delete documents. Every send or delete asks you for confirmation first.

This is a small bridge: a local MCP server that the client launches, which forwards everything to the SimplyBills server at `https://app.simplybills.de/api/mcp` over an authenticated connection. The login runs once in your browser, no tokens to copy.

> Requires a SimplyBills account on the Pro or Max plan. The KI-Schnittstelle (MCP) is included there. See [simplybills.de/ki-schnittstelle](https://simplybills.de/ki-schnittstelle).

## What your AI can do

- Read invoices, quotes, cancellations, customers, company data and expenses
- Create and update drafts: invoices, quotes, customers, expenses (Pro and Max)
- Send invoices, quotes and reminders, and delete documents (Max only, always with your confirmation)
- Find overdue invoices and draft reminders (the payment-coach flow)

Amounts, tax and the running invoice number are calculated by SimplyBills, so the AI cannot miscalculate them.

## Setup

You do not install anything by hand. Point your client at the command below; it runs through `npx`.

### Claude Desktop

Open Settings, Developer, Edit Config and add:

```json
{
  "mcpServers": {
    "simplybills": {
      "command": "npx",
      "args": ["-y", "simplybills-mcp"]
    }
  }
}
```

Restart Claude Desktop. On first use a browser window opens, you log in to SimplyBills and allow access. Done.

### Cursor

`~/.cursor/mcp.json` (or the project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "simplybills": {
      "command": "npx",
      "args": ["-y", "simplybills-mcp"]
    }
  }
}
```

### Cline, Windsurf, VS Code and other MCP clients

Use the same `command` / `args` shape in that client's MCP server configuration.

### ChatGPT and Claude.ai (web)

These support remote connectors directly, so you do not need this package. Add a custom connector pointing at `https://app.simplybills.de/api/mcp` and follow the login. Use this package for desktop or editor clients that launch a local command.

## How the login works

On first run the bridge:

1. registers itself with SimplyBills (OAuth 2.1 Dynamic Client Registration, a public PKCE client, no secret),
2. opens your browser to the SimplyBills consent screen,
3. catches the redirect on a local loopback address,
4. stores the resulting tokens under `~/.simplybills/`.

After that it reuses and refreshes those tokens silently. You never paste credentials, and the AI only ever receives a short-lived token bound to your account, which you can revoke any time under Einstellungen, KI-Schnittstelle.

## Configuration

Environment variables, all optional:

- `SIMPLYBILLS_MCP_URL` overrides the server URL (default `https://app.simplybills.de/api/mcp`). Useful for local development.
- `SIMPLYBILLS_SCOPE` overrides the requested scopes (default `read write send delete`). The server only grants what your plan permits: Pro gets `read` and `write`, Max also gets `send` and `delete`.

You can also pass the server URL as the first argument:

```json
{ "command": "npx", "args": ["-y", "simplybills-mcp", "http://localhost:3001/api/mcp"] }
```

## Security

- Tokens are stored locally under `~/.simplybills/` (files `0600`), never in the config you share.
- The connection is audience-bound to the SimplyBills MCP endpoint and uses PKCE (S256).
- Sending and deleting always require a confirmation step that the AI must surface to you before it runs.
- Revoke any connected AI at any time in SimplyBills under Einstellungen, KI-Schnittstelle.

## Development

```bash
npm install
npm run build      # tsc -> dist/
SIMPLYBILLS_MCP_URL=http://localhost:3001/api/mcp node dist/index.js
```

## License

MIT
