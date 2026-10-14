// Both AI routes allow 300 seconds. Leave time after generation to save the
// outline (or record a failed attempt) and send a response before the client stops.
export const AI_GENERATION_TIMEOUT_MS = 240_000;
export const AI_REQUEST_LIFETIME_MS = 270_000;
export const AI_CLIENT_TIMEOUT_MS = 290_000;
