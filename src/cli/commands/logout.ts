import { Command } from "commander";
import { saveCloudConfig, loadCloudConfig } from "../../cloud/client.js";

export const logoutCommand = new Command("logout")
  .description("Sign out of screencli cloud")
  .action(async () => {
    const config = loadCloudConfig();
    delete config.token;
    delete config.email;
    delete config.plan;
    saveCloudConfig(config);
    console.log("\n  ✓ Logged out\n");
  });
