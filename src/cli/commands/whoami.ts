import { Command } from "commander";
import { apiRequest, isLoggedIn } from "../../cloud/client.js";

interface UserInfo {
  name?: string;
  email: string;
  plan: string;
  credits: number;
  usage?: {
    recordingsThisMonth: number;
  };
}

export const whoamiCommand = new Command("whoami")
  .description("Show current user and plan info")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log("\n  Not logged in. Run: npx screencli login\n");
      return;
    }

    const res = await apiRequest("/api/me");
    if (!res.ok) {
      console.error("\n  ✗ Failed to fetch user info\n");
      process.exit(1);
    }

    const user = await res.json() as UserInfo;
    console.log(`\n  screencli whoami\n`);
    console.log(`  User:    ${user.name || user.email}`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  Plan:    ${user.plan}`);
    console.log(`  Credits: ${user.credits} remaining`);
    if (user.usage) {
      console.log(`  Recordings this month: ${user.usage.recordingsThisMonth}`);
    }
    console.log();
  });
