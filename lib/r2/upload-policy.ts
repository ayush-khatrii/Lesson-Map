// Shared by the upload form and server. Existing saved files are not restricted.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_SAVE_WINDOW_MS = 60 * 60 * 1000;
export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf", "image/gif", "image/jpeg", "image/png",
  "image/svg+xml", "image/webp",
] as const;
