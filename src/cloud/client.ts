import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const API_BASE = process.env.SCREENCLI_API_URL || "https://screencli.sh";
const CONFIG_PATH = path.join(os.homedir(), ".screencli", "config.json");

interface CloudConfig {
  token?: string;
  email?: string;
  plan?: string;
  // Legacy field — kept for backwards compat
  anthropicApiKey?: string;
}

export function loadCloudConfig(): CloudConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCloudConfig(config: CloudConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getToken(): string | null {
  return loadCloudConfig().token || null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * Validate the stored token against the server.
 * Returns the user info if valid, or null if the token is expired/revoked.
 */
export async function validateToken(): Promise<{ email?: string; plan?: string } | null> {
  const token = getToken();
  if (!token) return null;

  const fallback = { email: loadCloudConfig().email, plan: loadCloudConfig().plan };

  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return null;
    // Any other error (404, 500, etc.) — not a token problem, assume valid
    if (!res.ok) return fallback;
    return await res.json() as { email?: string; plan?: string };
  } catch {
    // Network error — can't validate, assume valid to allow offline scenarios
    return fallback;
  }
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof ArrayBuffer) && !(options.body instanceof ReadableStream) && !Buffer.isBuffer(options.body)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    console.error("\n  ✗ Not logged in. Run: npx screencli login\n");
    process.exit(1);
  }

  return res;
}
