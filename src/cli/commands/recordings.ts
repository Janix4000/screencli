import { Command } from "commander";
import { apiRequest, isLoggedIn } from "../../cloud/client.js";

interface Recording {
  id: string;
  status: string;
  title?: string;
  prompt?: string;
  url?: string;
  viewCount?: number;
}

export const recordingsCommand = new Command("recordings")
  .description("List your cloud recordings")
  .action(async () => {
    if (!isLoggedIn()) {
      console.log("\n  Not logged in. Run: npx screencli login\n");
      return;
    }

    const res = await apiRequest("/api/recordings");
    if (!res.ok) {
      console.error("\n  ✗ Failed to fetch recordings\n");
      process.exit(1);
    }

    const { recordings } = await res.json() as { recordings: Recording[] };

    if (!recordings.length) {
      console.log("\n  No recordings yet.\n");
      return;
    }

    console.log(`\n  screencli recordings (${recordings.length})\n`);
    for (const rec of recordings) {
      const status = rec.status === "ready" ? "✓" : rec.status === "uploading" ? "↑" : "✗";
      const title = rec.title || rec.prompt || rec.url || rec.id;
      const views = rec.viewCount || 0;
      console.log(`  ${status} ${rec.id.slice(0, 8)}  ${title.slice(0, 50).padEnd(50)}  ${views} views  https://screencli.sh/v/${rec.id}`);
    }
    console.log();
  });
