import http from "node:http";
import open from "open";
import { saveCloudConfig, loadCloudConfig } from "./client.js";

const API_BASE = process.env.SCREENCLI_API_URL || "https://screencli.sh";

export async function loginFlow(): Promise<{ email: string; plan: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === "/callback") {
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #07070B; color: #E2E2EA;">
                <div style="text-align: center;">
                  <h1>✗ Login failed</h1>
                  <p>${error}</p>
                </div>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(error));
          return;
        }

        const token = url.searchParams.get("token");
        const email = url.searchParams.get("email") || "";
        const plan = url.searchParams.get("plan") || "free";

        if (!token) {
          res.writeHead(400);
          res.end("Missing token");
          server.close();
          reject(new Error("No token received"));
          return;
        }

        // Save to config
        const config = loadCloudConfig();
        config.token = token;
        config.email = email;
        config.plan = plan;
        saveCloudConfig(config);

        // Send success page
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #07070B; color: #E2E2EA;">
              <div style="text-align: center;">
                <h1>✓ Logged in</h1>
                <p>You can close this window and return to your terminal.</p>
              </div>
            </body>
          </html>
        `);

        server.close();
        resolve({ email, plan });
      }
    });

    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const loginUrl = `${API_BASE}/login?cli_port=${port}`;
      console.log(`  Opening browser to sign in...`);
      open(loginUrl).catch(() => {
        console.log(`  Open this URL in your browser: ${loginUrl}`);
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Login timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}
