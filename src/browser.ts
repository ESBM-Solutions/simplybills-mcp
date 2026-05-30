import { spawn } from "node:child_process";

/**
 * Open the system browser at the given URL. Best-effort: if it fails, the URL
 * has already been printed to stderr so the user can paste it manually.
 */
export function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Ignore — the URL was logged for manual use.
  }
}
