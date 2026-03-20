import fs from "node:fs";
import path from "node:path";
import { apiRequest } from "./client.js";

interface UploadResult {
  id: string;
  url: string;
}

export async function uploadRecording(
  recordingDir: string,
  metadata: {
    id: string;
    url: string;
    prompt?: string;
    model?: string;
    viewport_w?: number;
    viewport_h?: number;
    duration_ms?: number;
    tokens_input?: number;
    tokens_output?: number;
    visibility?: string;
  }
): Promise<UploadResult> {
  // Create the recording entry on the server
  const createRes = await apiRequest("/api/recordings", {
    method: "POST",
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Failed to create recording: ${(err as { error: string }).error}`);
  }

  const { id, upload_urls } = await createRes.json() as { id: string; upload_urls: Record<string, string> };

  // Upload files
  const files: { type: string; localPath: string }[] = [
    { type: "video", localPath: path.join(recordingDir, "composed.mp4") },
    { type: "raw", localPath: path.join(recordingDir, "raw.webm") },
    { type: "events", localPath: path.join(recordingDir, "events.json") },
    { type: "thumbnail", localPath: path.join(recordingDir, "thumbnail.jpg") },
  ];

  for (const file of files) {
    if (fs.existsSync(file.localPath)) {
      const data = fs.readFileSync(file.localPath);
      const uploadPath = upload_urls[file.type];
      if (uploadPath) {
        const uploadRes = await apiRequest(uploadPath, {
          method: "PUT",
          body: data,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });

        if (!uploadRes.ok) {
          console.error(`  ⚠ Failed to upload ${file.type}`);
        }
      }
    }
  }

  // Confirm upload
  const confirmRes = await apiRequest(`/api/recordings/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({
      duration_ms: metadata.duration_ms,
      tokens_input: metadata.tokens_input,
      tokens_output: metadata.tokens_output,
    }),
  });

  if (!confirmRes.ok) {
    throw new Error("Failed to confirm upload");
  }

  const result = await confirmRes.json() as { url: string };
  return { id, url: result.url };
}
