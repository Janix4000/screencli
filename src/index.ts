export { runAgentLoop, type AgentLoopOptions, type AgentLoopResult } from './agent/loop.js';
export { launchSession, type BrowserSession } from './browser/session.js';
export { EventLog } from './recording/event-log.js';
export { writeMetadata, readMetadata } from './recording/metadata.js';
export { deriveChapters } from './recording/chapters.js';
export { composeVideo, type ComposeOptions } from './video/compose.js';
export { runExport, type ExportRunOptions } from './export/exporter.js';
export { getPreset, presets } from './export/presets.js';
export type {
  RecordingEvent,
  RecordingMetadata,
  ExportPreset,
  RecordOptions,
  ExportOptions,
  Viewport,
  BoundingBox,
  Chapter,
  AgentStats,
} from './recording/types.js';
