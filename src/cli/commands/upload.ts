import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { isLoggedIn } from "../../cloud/client.js";
import { uploadRecording } from "../../cloud/upload.js";

interface RecordingMetadata {
  id: string;
  url: string;
  prompt?: string;
  model?: string;
  viewport?: { width: number; height: number };
  duration_ms?: number;
}

export const uploadCommand = new Command("upload")
  .description("Upload an existing local recording to the cloud")
  .argument("<dir>", "Path to recording directory")
  .action(async (dir: string) => {
    if (!isLoggedIn()) {
      console.log("\n  Not logged in. Run: npx screencli login\n");
      return;
    }

    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) {
      console.error(`\n  ✗ Directory not found: ${absDir}\n`);
      process.exit(1);
    }

    // Read metadata
    const metadataPath = path.join(absDir, "metadata.json");
    if (!fs.existsSync(metadataPath)) {
      console.error(`\n  ✗ No metadata.json found in ${absDir}\n`);
      process.exit(1);
    }

    const metadata: RecordingMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const composedPath = path.join(absDir, "composed.mp4");
    const fileSize = fs.existsSync(composedPath)
      ? fs.statSync(composedPath).size
      : 0;

    console.log(`\n  screencli upload\n`);
    console.log(`  ↑ Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB...`);

    try {
      const result = await uploadRecording(absDir, {
        id: metadata.id,
        url: metadata.url,
        prompt: metadata.prompt,
        model: metadata.model,
        viewport_w: metadata.viewport?.width,
        viewport_h: metadata.viewport?.height,
        duration_ms: metadata.duration_ms,
      });

      console.log(`  ✓ ${result.url}`);
      console.log();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ Upload failed: ${message}\n`);
      process.exit(1);
    }
  });
