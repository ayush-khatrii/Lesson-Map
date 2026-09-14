"use client";

import { useRef, useState, type ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_TYPES } from "@/lib/r2/upload-policy";
import { toast } from "sonner";

export type UploadedResource = {
  id: string;
  name: string;
  meta: string | null;
  type: "PDF" | "Image";
  lessonId: string;
  url: string | null;
  key: string | null;
  filename: string | null;
  contentType: string | null;
  size: number | null;
};

type FileUploadProps = {
  lessonId: string;
  resourceName: string;
  type: "PDF" | "Image";
  accept: string;
  label: string;
  hint: string;
  icon: ElementType;
  disabled?: boolean;
  onUploaded?: (resource: UploadedResource) => void;
  onSelected?: (file: File | null) => void;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUpload = ({
  lessonId,
  resourceName,
  type,
  accept,
  label,
  hint,
  icon: Icon,
  disabled = false,
  onUploaded,
  onSelected,
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          size: file.size,
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadResponse.ok) {
        const failure = await uploadResponse.json().catch(() => null);
        throw new Error(failure?.error || "Failed to create upload URL");
      }

      const { uploadUrl, uploadHeaders, key } = (await uploadResponse.json()) as {
        uploadUrl: string;
        uploadHeaders: Record<string, string>;
        key: string;
      };

      const r2Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file,
      });

      if (!r2Response.ok) {
        throw new Error("File upload failed");
      }

      const completeResponse = await fetch("/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          name: resourceName.trim() || file.name,
          type,
          meta: `${formatFileSize(file.size)} · ${file.name}`,
          key,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!completeResponse.ok) {
        const failure = await completeResponse.json().catch(() => null);
        const validationDetails = Array.isArray(failure?.details)
          ? failure.details.map((issue: { message: string }) => issue.message).join("; ")
          : "";
        throw new Error(
          `Upload completed, but saving the resource failed (${completeResponse.status}): ${validationDetails || failure?.error || "Please try again."}`,
        );
      }

      const resource = (await completeResponse.json()) as UploadedResource;
      onUploaded?.(resource);
      toast.success("File uploaded and saved.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to upload file.");
      setSelectedFile(null);
      onSelected?.(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = (file: File) => {
    if (
      file.size < 1 ||
      file.size > MAX_UPLOAD_BYTES ||
      !ALLOWED_UPLOAD_TYPES.some((allowed) => allowed === file.type) ||
      (type === "PDF"
        ? file.type !== "application/pdf"
        : !file.type.startsWith("image/"))
    ) {
      toast.error("Choose a matching image or PDF between 1 byte and 25 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
    onSelected?.(file);
    void uploadFile(file);
  };

  const clearFile = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedFile(null);
    onSelected?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
        disabled || isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      } ${
        dragOver
          ? "border-primary bg-primary/5"
          : selectedFile
            ? "border-border bg-muted/40"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
      }`}
      onClick={() =>
        !disabled && !isUploading && !selectedFile && inputRef.current?.click()
      }
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !isUploading) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (disabled || isUploading) return;
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {selectedFile ? (
        <div className="flex items-center gap-3 w-full">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg border bg-background flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Icon className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {isUploading ? "Uploading..." : formatFileSize(selectedFile.size)}
            </p>
          </div>
          {!isUploading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={clearFile}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl border bg-background flex items-center justify-center">
            <Upload className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Drop your {label} here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hint} · Maximum 25 MB
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-3"
            disabled={disabled || isUploading}
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse files
          </Button>
        </>
      )}
    </div>
  );
};

export default FileUpload;
