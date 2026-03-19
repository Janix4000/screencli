import { Command } from "commander";
import { loginFlow } from "../../cloud/auth.js";
import { isLoggedIn, loadCloudConfig, validateToken, saveCloudConfig } from "../../cloud/client.js";

export const loginCommand = new Command("login")
  .description("Sign in to screencli cloud")
  .action(async () => {
    if (isLoggedIn()) {
      const validated = await validateToken();
      if (validated) {
        const config = loadCloudConfig();
        console.log(`\n  Already logged in as ${validated.email || config.email || "unknown"} (${validated.plan || config.plan || "free"} plan)`);
        console.log("  Run 'screencli logout' first to switch accounts.\n");
        return;
      }
      // Token exists but is invalid — clear it and re-login
      console.log("\n  Token invalid. Logging in again...\n");
      saveCloudConfig({ ...loadCloudConfig(), token: undefined });
    }

    console.log("\n  screencli login\n");

    try {
      const result = await loginFlow();
      console.log(`\n  ✓ Logged in as ${result.email} (${result.plan} plan)\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ Login failed: ${message}\n`);
      process.exit(1);
    }
  });
