import { Command } from "commander";
import { apiRequest, isLoggedIn } from "../../cloud/client.js";

export const deleteCommand = new Command("delete")
  .description("Delete a cloud recording")
  .argument("<id>", "Recording ID to delete")
  .action(async (id: string) => {
    if (!isLoggedIn()) {
      console.log("\n  Not logged in. Run: npx screencli login\n");
      return;
    }

    const res = await apiRequest(`/api/recordings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      console.error("\n  ✗ Failed to delete recording\n");
      process.exit(1);
    }

    console.log(`\n  ✓ Recording ${id} deleted\n`);
  });
