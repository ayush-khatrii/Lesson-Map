// Shared by the upload form and server. Existing saved files are not restricted.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_SAVE_WINDOW_MS = 60 * 60 * 1000;
export const FILE_RESOURCE_TYPES = ["PDF", "Image", "Document", "Spreadsheet"] as const;
export type FileResourceType = (typeof FILE_RESOURCE_TYPES)[number];

const OFFICE_FILES = {
  doc: { type: "Document", mime: "application/msword" },
  docx: { type: "Document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  xls: { type: "Spreadsheet", mime: "application/vnd.ms-excel" },
  xlsx: { type: "Spreadsheet", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  csv: { type: "Spreadsheet", mime: "text/csv" },
} as const;
export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf", "image/gif", "image/jpeg", "image/png",
  "image/svg+xml", "image/webp",
  ...Object.values(OFFICE_FILES).map((file) => file.mime),
] as const;

export function isFileResourceType(type: string): type is FileResourceType {
  return FILE_RESOURCE_TYPES.some((allowed) => allowed === type);
}

function officeFile(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension && Object.hasOwn(OFFICE_FILES, extension)
    ? OFFICE_FILES[extension as keyof typeof OFFICE_FILES]
    : undefined;
}

// Browsers may omit Office MIME types or report a generic binary/ZIP type.
// Only known extensions can use this fallback; conflicting specific types fail.
export function normalizeUploadContentType(filename: string, contentType: string): string | null {
  const mime = contentType.trim().toLowerCase();
  const office = officeFile(filename);
  if (office) {
    const generic = ["", "application/octet-stream", "application/zip", "application/x-zip-compressed"].includes(mime);
    const csvAlias = filename.toLowerCase().endsWith(".csv") && ["text/plain", "application/csv", "application/vnd.ms-excel"].includes(mime);
    return mime === office.mime || generic || csvAlias ? office.mime : null;
  }
  // New document types require a matching extension. Preserve PDF/image handling.
  return ALLOWED_UPLOAD_TYPES.some((allowed) => allowed === mime) &&
    (mime === "application/pdf" || mime.startsWith("image/")) ? mime : null;
}

export function matchesUploadResource(type: string, filename: string, contentType: string): boolean {
  const mime = normalizeUploadContentType(filename, contentType);
  if (!mime || mime !== contentType) return false;
  if (type === "PDF") return mime === "application/pdf";
  if (type === "Image") return mime.startsWith("image/");
  return officeFile(filename)?.type === type;
}

export function resourceDownloadDisposition(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "resource";
  const fallback = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const encoded = encodeURIComponent(basename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
