"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Eye,
  Save,
  GripVertical,
  ChevronDown,
  Plus,
  Paperclip,
  Code2,
  FileText,
  Link2,
  StickyNote,
  Image as ImageIcon,
  Trash2,
  LayoutList,
  Workflow,
  Globe,
  Copy,
  Check,
  AlertTriangle,
  Crown,
  Sparkles,
  Loader2,
  PenLine,
  BookOpen,
  Layers,
  Settings2,
  Share2,
  FileImage,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import FileUpload, {
  type UploadedResource,
} from "@/components/forms/FileUpload";
import { AiCourseGenerator } from "@/components/forms/AiCourseGenerator";
import {
  createCourseWithOutlineAction,
  createModulesAction,
  createLessonsAction,
  reorderModulesAction,
  reorderLessonsAction,
  updateCourseAction,
  deleteCourseAction,
  updateModuleAction,
  deleteModuleAction,
  updateLessonAction,
  deleteLessonAction,
} from "@/lib/actions";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent,
} from "@/components/kibo-ui/code-block";

// ── Types ──────────────────────────────────────────────────────────────
export type ResourceType = "Code" | "PDF" | "Link" | "Note" | "Image";

export interface Resource {
  id: string;
  name: string;
  meta: string | null;
  type: ResourceType;
  lessonId: string;
  content?: string | null;
  url?: string | null;
  key?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
}

export interface Lesson {
  id: string;
  name: string;
  description: string;
  resources?: Resource[];
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  lessons: Lesson[];
}

export interface CourseInitialData {
  courseId: string | null;
  title: string;
  description: string;
  audience?: string | null;
  modules: Module[];
  isPublic?: boolean;
  shareSlug?: string | null;
}

// ── Resource type config ──────────────────────────────────────────────
const RESOURCE_TYPES: {
  value: ResourceType;
  icon: React.ElementType;
}[] = [
  { value: "Code", icon: Code2 },
  { value: "PDF", icon: FileText },
  { value: "Link", icon: Link2 },
  { value: "Note", icon: StickyNote },
  { value: "Image", icon: ImageIcon },
];

function getTypeConfig(type: ResourceType) {
  return RESOURCE_TYPES.find((t) => t.value === type)!;
}

// ── Add Lesson Dialog ─────────────────────────────────────────────────
function AddLessonDialog({
  onAdd,
}: {
  onAdd: (name: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), description.trim());
    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full border-dashed">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add lesson</DialogTitle>
          <DialogDescription>
            Give your lesson a name and a short description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-name">Lesson name</Label>
            <Input
              id="lesson-name"
              placeholder="e.g. Async/Await Patterns"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-desc">Description</Label>
            <Textarea
              id="lesson-desc"
              placeholder="What will learners take away from this lesson?"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              className="min-h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Add lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Module Dialog ─────────────────────────────────────────────────
function AddModuleDialog({
  onAdd,
}: {
  onAdd: (name: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), description.trim());
    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Module
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add module</DialogTitle>
          <DialogDescription>
            Modules group related lessons together.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="module-name">Module name</Label>
            <Input
              id="module-name"
              placeholder="e.g. Module 4 — Working with APIs"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="module-desc">Description</Label>
            <Textarea
              id="module-desc"
              placeholder="What will learners learn in this module?"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              className="min-h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Add module
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditModuleDialog({
  module,
  onSave,
}: {
  module: Module;
  onSave: (name: string, description: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(module.name);
  const [description, setDescription] = useState(module.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(module.name);
      setDescription(module.description ?? "");
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (await onSave(name.trim(), description.trim())) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Edit module">
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit module</DialogTitle>
          <DialogDescription>Update this module and its description.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-module-${module.id}`}>Module name</Label>
            <Input id={`edit-module-${module.id}`} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-module-description-${module.id}`}>Description</Label>
            <Textarea id={`edit-module-description-${module.id}`} value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditLessonDialog({
  lesson,
  onSave,
}: {
  lesson: Lesson;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(lesson.name);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (await onSave(name.trim())) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Edit lesson">
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>Update this lesson title.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor={`edit-lesson-${lesson.id}`}>Lesson name</Label>
          <Input id={`edit-lesson-${lesson.id}`} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteItemButton({
  itemType,
  onDelete,
}: {
  itemType: "module" | "lesson";
  onDelete: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDeleting(true);
    try {
      if (await onDelete()) setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" title={`Delete ${itemType}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {itemType}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the {itemType} and its nested content. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Add Resource Dialog ───────────────────────────────────────────────
function AddResourceDialog({
  lessonId,
  lessonName,
  onAdd,
}: {
  lessonId: string;
  lessonName: string;
  onAdd: (resource: Resource) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState("");
  const [type, setType] = useState<ResourceType>("Link");
  const [noteContent, setNoteContent] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setName("");
    setMeta("");
    setNoteContent("");
    setCodeContent("");
    setType("Link");
  };

  const handleUploaded = (resource: UploadedResource) => {
    onAdd({ ...resource, type: resource.type });
    reset();
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (type === "PDF" || type === "Image") {
      toast.error("Select a file to upload first.");
      return;
    }

    const finalMeta =
      type === "Code"
        ? `${codeContent.split("\n").length} lines · ${name}`
        : type === "Note"
          ? meta.trim() || noteContent.slice(0, 80) || "Note"
          : meta.trim() || "Untitled resource";

    setIsSaving(true);
    try {
      const response = await fetch("/api/resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          name: name.trim(),
          meta: finalMeta,
          type,
          content:
            type === "Code"
              ? codeContent
              : type === "Note"
                ? noteContent
                : undefined,
          url: type === "Link" ? meta.trim() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save resource.");
      }

      const resource = (await response.json()) as Resource;
      onAdd(resource);
      reset();
      setOpen(false);
      toast.success("Resource added.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save resource.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full px-2 text-xs sm:h-7 sm:w-auto"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription>
            Attach a resource to{" "}
            <span className="font-medium text-foreground">{lessonName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          {/* ── Type selector ── */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="rounded-lg border bg-muted/30 p-1">
              <ToggleGroup
                type="single"
                value={type}
                onValueChange={(v: string) => v && setType(v as ResourceType)}
                className="flex flex-wrap items-center gap-1 justify-start"
              >
                {RESOURCE_TYPES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <ToggleGroupItem
                      key={t.value}
                      value={t.value}
                      size="sm"
                      className="gap-1.5 text-xs rounded-md h-7 px-2.5 data-[state=on]:bg-background data-[state=on]:border data-[state=on]:border-border data-[state=on]:shadow-sm"
                    >
                      <TIcon className="w-3 h-3" />
                      {t.value}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          </div>

          {/* ── Name ── */}
          <div className="space-y-1.5">
            <Label htmlFor="res-name">Name</Label>
            <Input
              id="res-name"
              placeholder={
                type === "PDF"
                  ? "e.g. Week 1 Reading.pdf"
                  : type === "Image"
                    ? "e.g. Architecture Diagram.png"
                    : type === "Note"
                      ? "e.g. Key Takeaways"
                      : type === "Code"
                        ? "e.g. async-await.js"
                        : "e.g. MDN Docs"
              }
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>

          {/* ── Type-specific inputs ── */}
          {type === "PDF" && (
            <div className="space-y-1.5">
              <Label>PDF File</Label>
              <FileUpload
                lessonId={lessonId}
                resourceName={name}
                type="PDF"
                accept=".pdf,application/pdf"
                label="PDF"
                icon={FileText}
                hint="PDF up to 50 MB"
                onSelected={(f) =>
                  setMeta(
                    f ? `${(f.size / 1024).toFixed(1)} KB · ${f.name}` : "",
                  )
                }
                onUploaded={handleUploaded}
                disabled={!name.trim()}
              />
            </div>
          )}

          {type === "Image" && (
            <div className="space-y-1.5">
              <Label>Image File</Label>
              <FileUpload
                lessonId={lessonId}
                resourceName={name}
                type="Image"
                accept="image/*"
                label="image"
                icon={FileImage}
                hint="PNG, JPG, GIF, SVG up to 10 MB"
                onSelected={(f) =>
                  setMeta(
                    f ? `${(f.size / 1024).toFixed(1)} KB · ${f.name}` : "",
                  )
                }
                onUploaded={handleUploaded}
                disabled={!name.trim()}
              />
            </div>
          )}

          {type === "Note" && (
            <div className="space-y-1.5">
              <Label htmlFor="res-note">Note content</Label>
              <Textarea
                id="res-note"
                placeholder="Write your note here…"
                value={noteContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setNoteContent(e.target.value);
                  setMeta(
                    e.target.value.slice(0, 80) +
                      (e.target.value.length > 80 ? "…" : ""),
                  );
                }}
                className="min-h-28 max-h-48 resize-none text-sm"
              />
            </div>
          )}

          {type === "Code" && (
            <div className="space-y-1.5">
              <Label htmlFor="res-code">Code</Label>
              <Textarea
                id="res-code"
                placeholder="Paste your code here…"
                value={codeContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCodeContent(e.target.value)
                }
                className="min-h-32 max-h-64 resize-y text-sm font-mono leading-relaxed overflow-y-auto"
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground">
                {codeContent
                  ? `${codeContent.split("\n").length} lines`
                  : "Syntax highlighted preview in lesson resources"}
              </p>
            </div>
          )}

          {type === "Link" && (
            <div className="space-y-1.5">
              <Label htmlFor="res-meta">Details</Label>
              <Input
                id="res-meta"
                placeholder={"e.g. https://developer.mozilla.org"}
                value={meta}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMeta(e.target.value)
                }
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() || isSaving || type === "PDF" || type === "Image"
            }
          >
            {isSaving && (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            )}
            {type === "PDF" || type === "Image"
              ? "Upload file"
              : "Add resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Resource Row ──────────────────────────────────────────────────────
function ResourceRow({
  resource,
  onTypeChange,
  onDelete,
  linkedToLabel,
}: {
  resource: Resource;
  onTypeChange: (id: string, type: ResourceType) => void;
  onDelete: (id: string) => void;
  linkedToLabel?: string;
}) {
  const config = getTypeConfig(resource.type);
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-md bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug truncate">
          {resource.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {resource.meta}
          {linkedToLabel && (
            <>
              {" "}
              <span className="text-muted-foreground/50">·</span>{" "}
              <Paperclip className="w-2.5 h-2.5 inline-block mb-0.5 mr-0.5 opacity-60" />
              Linked to{" "}
              <span className="font-semibold text-foreground">
                {linkedToLabel}
              </span>
            </>
          )}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <Icon className="w-3 h-3" />
            {resource.type}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {RESOURCE_TYPES.map((t) => {
            const TIcon = t.icon;
            return (
              <DropdownMenuItem
                key={t.value}
                onClick={() => onTypeChange(resource.id, t.value)}
                className="gap-2"
              >
                <TIcon className="w-3.5 h-3.5" />
                {t.value}
                {resource.type === t.value && (
                  <Check className="w-3.5 h-3.5 ml-auto" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Delete"
        onClick={() => onDelete(resource.id)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Drag handle context ───────────────────────────────────────────────
const DragHandleContext = React.createContext<
  Record<string, unknown> | undefined
>(undefined);

function DragHandle({ children }: { children: React.ReactNode }) {
  const listeners = React.useContext(DragHandleContext);
  return (
    <span
      className="cursor-grab active:cursor-grabbing touch-none inline-flex"
      {...listeners}
    >
      {children}
    </span>
  );
}

// ── Sortable Module Item ──────────────────────────────────────────────
function SortableModuleItem({
  module,
  children,
}: {
  module: Module;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <DragHandleContext.Provider value={listeners}>
      <div ref={setNodeRef} style={style} {...attributes}>
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}

// ── Sortable Lesson Item ──────────────────────────────────────────────
function SortableLessonItem({
  lessonId,
  children,
}: {
  lessonId: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lessonId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <DragHandleContext.Provider value={listeners}>
      <div ref={setNodeRef} style={style} {...attributes}>
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}

// ── Index Badge ───────────────────────────────────────────────────────
function IndexBadge({ index }: { index: number }) {
  return (
    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground leading-none select-none">
      {index}
    </span>
  );
}

// ── Outline Tab ───────────────────────────────────────────────────────
function OutlineTab({
  courseId,
  modules,
  resources,
  setModules,
  setResources,
}: {
  courseId: string | null;
  modules: Module[];
  resources: Resource[];
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
}) {
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  // Track which code accordions have been opened (lazy-load Shiki)
  const [openedCodeAccordions, setOpenedCodeAccordions] = useState<Set<string>>(
    new Set(),
  );

  const moduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const resourcesForLesson = (lessonId: string) =>
    resources.filter((r) => r.lessonId === lessonId);

  const handleModuleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(modules, oldIndex, newIndex);
      setModules(reordered);
      if (courseId) {
        void reorderModulesAction(
          courseId,
          reordered.map((m) => m.id),
        ).then((result) => {
          if (!result.success) {
            setModules(modules);
            toast.error(result.error || "Failed to persist module order.");
          }
        });
      }
    },
    [modules, setModules, courseId],
  );

  const handleAddModule = async (name: string, description: string) => {
    if (!courseId) {
      setModules((previous) => [
        ...previous,
        {
          id: `draft-module-${crypto.randomUUID()}`,
          name,
          description: description || "No description provided.",
          lessons: [],
        },
      ]);
      toast.success("Module added to your draft.");
      return;
    }
    setIsAddingModule(true);
    try {
      const result = await createModulesAction({
        courseId,
        modules: [
          {
            moduleName: name,
            description: description || "",
            order: modules.length + 1,
          },
        ],
      });
      if (result.success && result.data && result.data.length > 0) {
        const created = result.data[0];
        setModules((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.moduleName,
            description: created.description,
            lessons: [],
          },
        ]);
        toast.success("Module added!");
      } else {
        const errResult = result as Record<string, unknown>;
        if (errResult.errors) {
          const messages = Object.values(
            errResult.errors as Record<string, string>,
          ).join(", ");
          toast.error(messages);
        } else {
          toast.error((errResult.error as string) || "Failed to add module.");
        }
      }
    } catch {
      toast.error("Failed to add module.");
    } finally {
      setIsAddingModule(false);
    }
  };

  const handleAddLesson = async (
    moduleId: string,
    name: string,
    description: string,
  ) => {
    if (!courseId) {
      setModules((previous) =>
        previous.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                lessons: [
                  ...module.lessons,
                  {
                    id: `draft-lesson-${crypto.randomUUID()}`,
                    name,
                    description,
                    resources: [],
                  },
                ],
              }
            : module,
        ),
      );
      toast.success("Lesson added to your draft.");
      return;
    }
    setAddingLessonFor(moduleId);
    try {
      const mod = modules.find((m) => m.id === moduleId);
      const lessonCount = mod?.lessons.length ?? 0;
      const result = await createLessonsAction({
        moduleId,
        lessons: [{ lessonName: name, order: lessonCount + 1 }],
      });
      if (result.success && result.data && result.data.length > 0) {
        const created = result.data[0];
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: [
                    ...m.lessons,
                    { id: created.id, name: created.lessonName, description },
                  ],
                }
              : m,
          ),
        );
        toast.success("Lesson added!");
      } else {
        const errResult = result as Record<string, unknown>;
        if (errResult.errors) {
          const messages = Object.values(
            errResult.errors as Record<string, string>,
          ).join(", ");
          toast.error(messages);
        } else {
          toast.error((errResult.error as string) || "Failed to add lesson.");
        }
      }
    } catch {
      toast.error("Failed to add lesson.");
    } finally {
      setAddingLessonFor(null);
    }
  };

  const handleEditModule = async (moduleId: string, name: string, description: string) => {
    if (!courseId) {
      setModules((previous) => previous.map((module) => module.id === moduleId
        ? { ...module, name, description: description || "No description provided." }
        : module));
      return true;
    }
    const moduleIndex = modules.findIndex((module) => module.id === moduleId);
    const result = await updateModuleAction(moduleId, {
      moduleName: name,
      description: description || "No description provided.",
      order: moduleIndex + 1,
    });
    if (!result.success) {
      toast.error(result.error || Object.values(result.errors ?? {}).join(", ") || "Failed to update module.");
      return false;
    }
    setModules((previous) => previous.map((module) => module.id === moduleId
      ? { ...module, name, description: description || "No description provided." }
      : module));
    toast.success("Module updated.");
    return true;
  };

  const handleDeleteModule = async (moduleId: string) => {
    const module = modules.find((item) => item.id === moduleId);
    if (!courseId) {
      const lessonIds = new Set(module?.lessons.map((lesson) => lesson.id));
      setModules((previous) => previous.filter((item) => item.id !== moduleId));
      setResources((previous) => previous.filter((resource) => !lessonIds.has(resource.lessonId)));
      return true;
    }
    const result = await deleteModuleAction(moduleId);
    if (!result.success) {
      toast.error(result.error || "Failed to delete module.");
      return false;
    }
    const lessonIds = new Set(module?.lessons.map((lesson) => lesson.id));
    setModules((previous) => previous.filter((item) => item.id !== moduleId));
    setResources((previous) => previous.filter((resource) => !lessonIds.has(resource.lessonId)));
    toast.success("Module deleted.");
    return true;
  };

  const handleEditLesson = async (lessonId: string, name: string) => {
    if (!courseId) {
      setModules((previous) => previous.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, name } : lesson),
      })));
      return true;
    }
    const result = await updateLessonAction(lessonId, { lessonName: name });
    if (!result.success) {
      toast.error(result.error || Object.values(result.errors ?? {}).join(", ") || "Failed to update lesson.");
      return false;
    }
    setModules((previous) => previous.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, name } : lesson),
    })));
    toast.success("Lesson updated.");
    return true;
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!courseId) {
      setModules((previous) => previous.map((module) => module.id === moduleId
        ? { ...module, lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) }
        : module));
      setResources((previous) => previous.filter((resource) => resource.lessonId !== lessonId));
      return true;
    }
    const result = await deleteLessonAction(lessonId);
    if (!result.success) {
      toast.error(result.error || "Failed to delete lesson.");
      return false;
    }
    setModules((previous) => previous.map((module) => module.id === moduleId
      ? { ...module, lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) }
      : module));
    setResources((previous) => previous.filter((resource) => resource.lessonId !== lessonId));
    toast.success("Lesson deleted.");
    return true;
  };

  const handleLessonDragEnd = useCallback(
    (moduleId: string, event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setModules((prev) => {
        const targetModule = prev.find((m) => m.id === moduleId);
        if (!targetModule) return prev;
        const oldIndex = targetModule.lessons.findIndex(
          (l) => l.id === active.id,
        );
        const newIndex = targetModule.lessons.findIndex(
          (l) => l.id === over.id,
        );
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reorderedLessons = arrayMove(
          targetModule.lessons,
          oldIndex,
          newIndex,
        );
        const previousLessons = targetModule.lessons;
        queueMicrotask(() => {
          void reorderLessonsAction(
            moduleId,
            reorderedLessons.map((l) => l.id),
          ).then((result) => {
            if (!result.success) {
              setModules((current) => current.map((module) =>
                module.id === moduleId ? { ...module, lessons: previousLessons } : module,
              ));
              toast.error(result.error || "Failed to persist lesson order.");
            }
          });
        });
        return prev.map((m) =>
          m.id === moduleId ? { ...m, lessons: reorderedLessons } : m,
        );
      });
    },
    [],
  );

  const handleAddResource = (resource: Resource) => {
    setResources((prev) => [...prev, resource]);
  };

  const handleTypeChange = async (id: string, type: ResourceType) => {
    const previous = resources.find((resource) => resource.id === id);
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, type } : r)));
    try {
      const response = await fetch(`/api/resource/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) throw new Error("Failed to update resource.");
    } catch {
      if (previous) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, type: previous.type } : r)),
        );
      }
      toast.error("Failed to update resource.");
    }
  };

  const handleDeleteResource = async (id: string) => {
    const previous = resources.find((resource) => resource.id === id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    try {
      const response = await fetch(`/api/resource/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete resource.");
    } catch {
      if (previous) setResources((prev) => [...prev, previous]);
      toast.error("Failed to delete resource.");
    }
  };

  const moduleIds = modules.map((m) => m.id);

  return (
    <DndContext
      sensors={moduleSensors}
      collisionDetection={closestCenter}
      onDragEnd={handleModuleDragEnd}
    >
      <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {modules.map((module, moduleIndex) => (
            <SortableModuleItem key={module.id} module={module}>
              <Accordion type="single" collapsible defaultValue={module.id}>
                <AccordionItem
                  value={module.id}
                  className="min-w-0 overflow-hidden rounded-2xl border"
                >
                  <AccordionTrigger className="group px-2.5 py-3 transition-colors hover:bg-muted/30 hover:no-underline sm:px-4 sm:py-3.5 [&>svg]:hidden">
                    <div className="flex min-w-0 w-full items-start gap-1.5 sm:items-center sm:gap-3">
                      <DragHandle>
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      </DragHandle>
                      {/* ── Module index circular badge ── */}
                      <IndexBadge index={moduleIndex + 1} />
                      <p className="min-w-0 flex-1 break-words text-left text-xs font-semibold leading-snug [overflow-wrap:anywhere] sm:text-sm">
                        {module.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="hidden flex-shrink-0 text-[10px] font-medium sm:inline-flex"
                      >
                        {module.lessons.length}{" "}
                        {module.lessons.length === 1 ? "lesson" : "lessons"}
                      </Badge>
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="mb-3 flex justify-end gap-1">
                      <EditModuleDialog
                        module={module}
                        onSave={(name, description) => handleEditModule(module.id, name, description)}
                      />
                      <DeleteItemButton
                        itemType="module"
                        onDelete={() => handleDeleteModule(module.id)}
                      />
                    </div>
                    {module.description && (
                      <p className="mb-3 break-words text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    )}
                    <div className="space-y-2.5 mt-1">
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleLessonDragEnd(module.id, e)}
                      >
                        <SortableContext
                          items={module.lessons.map((l) => l.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {module.lessons.map((lesson, lessonIndex) => {
                            const lessonResources = resourcesForLesson(
                              lesson.id,
                            );
                            return (
                              <SortableLessonItem
                                key={lesson.id}
                                lessonId={lesson.id}
                              >
                                <div className="min-w-0 overflow-hidden rounded-xl border bg-background shadow-none">
                                  <div className="flex min-w-0 flex-wrap items-start gap-2 px-3 py-3 sm:flex-nowrap sm:gap-3 sm:px-3.5">
                                    <DragHandle>
                                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                                    </DragHandle>
                                    {/* ── Lesson index circular badge ── */}
                                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground leading-none select-none mt-0.5">
                                      {lessonIndex + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="break-words text-sm font-semibold leading-snug">
                                        {lesson.name}
                                      </p>
                                      {lesson.description && (
                                        <p className="mt-0.5 break-words text-xs text-muted-foreground">
                                          {lesson.description}
                                        </p>
                                      )}
                                    </div>
                                    <AddResourceDialog
                                      lessonId={lesson.id}
                                      lessonName={lesson.name}
                                      onAdd={handleAddResource}
                                    />
                                    <EditLessonDialog
                                      lesson={lesson}
                                      onSave={(name) => handleEditLesson(lesson.id, name)}
                                    />
                                    <DeleteItemButton
                                      itemType="lesson"
                                      onDelete={() => handleDeleteLesson(module.id, lesson.id)}
                                    />
                                  </div>

                                  {lessonResources.length > 0 && (
                                    <div className="border-t">
                                      <Accordion type="single" collapsible>
                                        <AccordionItem
                                          value={`res-${lesson.id}`}
                                          className="border-none"
                                        >
                                          <AccordionTrigger className="px-3.5 py-2 hover:no-underline [&>svg]:hidden group">
                                            <div className="flex items-center gap-2 w-full">
                                              <Paperclip className="w-3 h-3 text-primary" />
                                              <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">
                                                Lesson Resources (
                                                {lessonResources.length})
                                              </span>
                                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="px-3.5 pb-3">
                                            <div className="rounded-lg border overflow-hidden">
                                              {lessonResources.map((res) =>
                                                res.type === "Code" &&
                                                res.content ? (
                                                  <Accordion
                                                    key={res.id}
                                                    type="single"
                                                    collapsible
                                                    onValueChange={(v) => {
                                                      if (v === res.id) {
                                                        setOpenedCodeAccordions(
                                                          (prev) => {
                                                            const next =
                                                              new Set(prev);
                                                            next.add(res.id);
                                                            return next;
                                                          },
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <AccordionItem
                                                      value={res.id}
                                                      className="border-none"
                                                    >
                                                      <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden group border-b border-border last:border-b-0">
                                                        <div className="flex items-center gap-3 w-full">
                                                          <div className="flex-shrink-0 w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                                                            <Code2 className="w-4 h-4 text-muted-foreground" />
                                                          </div>
                                                          <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-sm font-semibold leading-snug truncate">
                                                              {res.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                              {res.meta}
                                                            </p>
                                                          </div>
                                                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                        </div>
                                                      </AccordionTrigger>
                                                      <AccordionContent className="p-0">
                                                        {openedCodeAccordions.has(
                                                          res.id,
                                                        ) && (
                                                          <div className="border-b border-border">
                                                            <CodeBlock
                                                              value={res.name}
                                                              data={[
                                                                {
                                                                  language:
                                                                    "typescript",
                                                                  filename:
                                                                    res.name,
                                                                  code: res.content,
                                                                },
                                                              ]}
                                                            >
                                                              <div className="max-w-full overflow-x-auto">
                                                                <CodeBlockHeader className="border-b bg-muted/40 px-4 py-2">
                                                                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                                    <Code2 className="w-3.5 h-3.5" />
                                                                    {res.name}
                                                                  </div>
                                                                </CodeBlockHeader>
                                                                <CodeBlockBody>
                                                                  {(item) => (
                                                                    <CodeBlockItem
                                                                      value={
                                                                        item.filename
                                                                      }
                                                                      lineNumbers
                                                                    >
                                                                      <CodeBlockContent
                                                                        language={
                                                                          "typescript" as any
                                                                        }
                                                                      >
                                                                        {res.content ??
                                                                          ""}
                                                                      </CodeBlockContent>
                                                                    </CodeBlockItem>
                                                                  )}
                                                                </CodeBlockBody>
                                                              </div>
                                                            </CodeBlock>
                                                          </div>
                                                        )}
                                                      </AccordionContent>
                                                    </AccordionItem>
                                                  </Accordion>
                                                ) : (
                                                  <ResourceRow
                                                    key={res.id}
                                                    resource={res}
                                                    onTypeChange={
                                                      handleTypeChange
                                                    }
                                                    onDelete={
                                                      handleDeleteResource
                                                    }
                                                  />
                                                ),
                                              )}
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </div>
                                  )}
                                </div>
                              </SortableLessonItem>
                            );
                          })}
                        </SortableContext>
                      </DndContext>

                      <AddLessonDialog
                        onAdd={(name, description) =>
                          handleAddLesson(module.id, name, description)
                        }
                      />
                      {addingLessonFor === module.id && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          Saving lesson…
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SortableModuleItem>
          ))}

          <AddModuleDialog onAdd={handleAddModule} />
          {isAddingModule && (
            <p className="text-[10px] text-muted-foreground text-center">
              Saving module…
            </p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ── Resources Tab ─────────────────────────────────────────────────────
function ResourcesTab({
  modules,
  resources,
  setResources,
}: {
  modules: Module[];
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
}) {
  const [filter, setFilter] = useState<ResourceType | "All">("All");

  const handleTypeChange = async (id: string, type: ResourceType) => {
    const previous = resources.find((resource) => resource.id === id);
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, type } : r)));
    try {
      const response = await fetch(`/api/resource/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) throw new Error("Failed to update resource.");
    } catch {
      if (previous) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, type: previous.type } : r)),
        );
      }
      toast.error("Failed to update resource.");
    }
  };

  const handleDeleteResource = async (id: string) => {
    const previous = resources.find((resource) => resource.id === id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    try {
      const response = await fetch(`/api/resource/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete resource.");
    } catch {
      if (previous) setResources((prev) => [...prev, previous]);
      toast.error("Failed to delete resource.");
    }
  };

  const lessonNameById = (lessonId: string) => {
    for (const m of modules) {
      const l = m.lessons.find((l) => l.id === lessonId);
      if (l) return l.name;
    }
    return "Unknown lesson";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Resource Library</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {resources.length} resources across{" "}
            {modules.reduce((a, m) => a + m.lessons.length, 0)} lessons. Grouped
            by module — click any to edit.
          </p>
        </div>
        {/* ── Filter toggle with border ── */}
        <div className="rounded-lg border bg-muted/30 p-1">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v: string) =>
              v && setFilter(v as ResourceType | "All")
            }
            className="flex flex-wrap gap-1 justify-start"
          >
            <ToggleGroupItem
              value="All"
              size="sm"
              className="h-7 px-2.5 text-[11px] rounded-md data-[state=on]:bg-background data-[state=on]:border data-[state=on]:border-border data-[state=on]:shadow-sm"
            >
              All
            </ToggleGroupItem>
            {RESOURCE_TYPES.map((t) => (
              <ToggleGroupItem
                key={t.value}
                value={t.value}
                size="sm"
                className="h-7 px-2.5 text-[11px] rounded-md data-[state=on]:bg-background data-[state=on]:border data-[state=on]:border-border data-[state=on]:shadow-sm"
              >
                {t.value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="space-y-3">
        {modules.map((module) => {
          const moduleLessonIds = new Set(module.lessons.map((l) => l.id));
          const moduleResources = resources.filter(
            (r) =>
              moduleLessonIds.has(r.lessonId) &&
              (filter === "All" || r.type === filter),
          );
          return (
            <Accordion
              key={module.id}
              type="single"
              collapsible
              defaultValue={module.id}
            >
              <AccordionItem
                value={module.id}
                className="border rounded-2xl overflow-hidden"
              >
                <AccordionTrigger className="group px-2.5 py-3 hover:bg-muted/30 hover:no-underline sm:px-4 sm:py-3.5 [&>svg]:hidden">
                  <div className="flex w-full min-w-0 items-start gap-2 sm:items-center sm:gap-2.5">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="min-w-0 flex-1 break-words text-left text-xs font-semibold leading-snug [overflow-wrap:anywhere] sm:text-sm">
                      {module.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className="hidden flex-shrink-0 text-[10px] font-medium sm:inline-flex"
                    >
                      {moduleResources.length} resources
                    </Badge>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  {moduleResources.length > 0 ? (
                    <div className="border-t">
                      {moduleResources.map((res) => (
                        <ResourceRow
                          key={res.id}
                          resource={res}
                          onTypeChange={handleTypeChange}
                          onDelete={handleDeleteResource}
                          linkedToLabel={lessonNameById(res.lessonId)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-t">
                      <p className="text-xs text-muted-foreground">
                        No resources match this filter.
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────
function SettingsRow({
  icon: Icon,
  title,
  description,
  control,
  destructive = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  control: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background overflow-hidden shadow-none">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              destructive ? "bg-destructive/10" : "bg-muted"
            }`}
          >
            <Icon
              className={`w-4 h-4 ${destructive ? "text-destructive" : "text-muted-foreground"}`}
            />
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${destructive ? "text-destructive" : ""}`}
            >
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">{control}</div>
      </div>
    </div>
  );
}

function SettingsTab({
  courseId,
  isPublic,
  shareSlug,
  onTogglePublic,
  isToggling,
  onExportMarkdown,
  isExporting,
}: {
  courseId: string | null;
  isPublic: boolean;
  shareSlug?: string | null;
  onTogglePublic: (checked: boolean) => void;
  isToggling: boolean;
  onExportMarkdown: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="space-y-3">
      <SettingsRow
        icon={Eye}
        title="Visibility"
        description={
          isPublic
            ? "Anyone with the link can view this course"
            : "Only you can view this course"
        }
        control={
          <Switch
            checked={isPublic}
            onCheckedChange={onTogglePublic}
            disabled={isToggling}
          />
        }
      />
      <SettingsRow
        icon={Download}
        title="Export Markdown"
        description="Download your course as a Markdown file"
        control={
          <Button
            size="sm"
            variant="outline"
            onClick={onExportMarkdown}
            disabled={!courseId || isExporting}
          >
            {isExporting ? "Exporting…" : "Download .md"}
          </Button>
        }
      />
    </div>
  );
}

// ── Share Tab ─────────────────────────────────────────────────────────
function ShareTab({
  isPublic,
  shareSlug,
  onTogglePublic,
  isToggling,
}: {
  isPublic: boolean;
  shareSlug?: string | null;
  onTogglePublic: (checked: boolean) => void;
  isToggling: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const shareLink = shareSlug ? `${window.location.origin}/p/${shareSlug}` : "";

  const handleCopy = () => {
    if (!shareLink) return;
    navigator.clipboard?.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <SettingsRow
        icon={Globe}
        title="Allow public sharing"
        description="Anyone with the link below can view this course outline."
        control={
          <Switch
            checked={isPublic}
            onCheckedChange={onTogglePublic}
            disabled={isToggling}
          />
        }
      />
      <div
        className={`rounded-xl border bg-background overflow-hidden shadow-none transition-opacity ${
          isPublic ? "" : "opacity-50 pointer-events-none"
        }`}
      >
        <div className="flex flex-row items-start gap-3 p-4 pb-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Public share link</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share a beautiful, mobile-optimized version of your course
              outline.
            </p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareLink || "Enable public sharing to generate a link"}
              className="text-xs font-mono"
            />
            <Button
              size="sm"
              onClick={handleCopy}
              disabled={!shareLink}
              className="flex-shrink-0 gap-1.5"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview Dialog ────────────────────────────────────────────────────
function PreviewDialog({
  title,
  description,
  modules,
  resources,
}: {
  title: string;
  description: string;
  modules: Module[];
  resources: Resource[];
}) {
  const [open, setOpen] = useState(false);
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words pr-6 text-base leading-snug [overflow-wrap:anywhere] sm:text-xl">
            {title || "Untitled course"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-[10px]">
            {modules.length} modules
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {totalLessons} lessons
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {resources.length} resources
          </Badge>
        </div>
        <Separator />
        <div className="space-y-4">
          {modules.map((module, mi) => (
            <div key={module.id}>
              <p className="mb-2 break-words text-xs font-semibold [overflow-wrap:anywhere] sm:text-sm">
                {module.name}
              </p>
              <div className="space-y-1.5 pl-3 border-l">
                {module.lessons.map((lesson, li) => (
                  <div key={lesson.id} className="text-xs">
                    <span className="font-medium">
                      {mi + 1}.{li + 1} {lesson.name}
                    </span>
                    {lesson.description && (
                      <p className="text-muted-foreground mt-0.5">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                ))}
                {module.lessons.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No lessons yet
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Upgrade Dialog ────────────────────────────────────────────────────
function UpgradeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Flow Map is a Creator Plan feature</DialogTitle>
          <DialogDescription>
            Visualize your course as an interactive flow diagram, with branching
            paths and module connections — available on the Creator plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {[
            "Visual flow map of modules & lessons",
            "Unlimited courses and resources",
            "AI-powered course regeneration",
            "Priority support",
          ].map((perk) => (
            <div key={perk} className="flex items-center gap-2.5 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              {perk}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
          <Button asChild className="gap-1.5">
            <Link href="/pricing">
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to Creator
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 min-w-[80px]">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-base font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── MAIN EXPORT: CourseBuilder ────────────────────────────────────────
interface CourseBuilderProps {
  initialData?: CourseInitialData;
}

export function CourseBuilder({ initialData }: CourseBuilderProps) {
  const { data: session } = useSession();
  const initialResources =
    initialData?.modules.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.resources ?? []),
    ) ?? [];
  const [courseId, setCourseId] = useState<string | null>(
    initialData?.courseId ?? null,
  );
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [modules, setModules] = useState<Module[]>(initialData?.modules ?? []);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [outlineView, setOutlineView] = useState("accordion");

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [shareSlug, setShareSlug] = useState<string | null | undefined>(
    initialData?.shareSlug ?? null,
  );
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);

  const handleSave = async () => {
    if (isGenerating) return;
    if (!session) {
      toast.error("Please log in to save your course.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a course title.");
      return;
    }
    setIsSaving(true);
    try {
      if (courseId) {
        const result = await updateCourseAction(courseId, {
          courseName: title.trim(),
          description: description.trim(),
        });
        if (result.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          toast.success("Course updated!");
        } else {
          toast.error(
            ((result as Record<string, unknown>).error as string) ||
              "Failed to update course.",
          );
        }
      } else {
        const result = await createCourseWithOutlineAction({
          courseName: title.trim(),
          description: description.trim(),
          modules: modules.map((module) => ({
            moduleName: module.name.trim(),
            description:
              module.description?.trim() || "No description provided.",
            lessons: module.lessons.map((lesson) => ({
              lessonName: lesson.name.trim(),
            })),
          })),
        });
        if (result.success && result.data) {
          setCourseId(result.data.id);
          setTitle(result.data.courseName);
          setDescription(result.data.description);
          setModules(
            result.data.Module.map((module) => ({
              id: module.id,
              name: module.moduleName,
              description: module.description,
              lessons: module.Lesson.map((lesson) => ({
                id: lesson.id,
                name: lesson.lessonName,
                description: "",
                resources: [],
              })),
            })),
          );
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          toast.success(
            modules.length
              ? "Course template created successfully!"
              : "Course created! Now add modules and lessons.",
          );
        } else if ((result as Record<string, unknown>).limitReached) {
          toast.error((result as Record<string, unknown>).message as string);
        } else {
          toast.error("Failed to create course. Please try again.");
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = () => {
    setEditTitle(title);
    setEditDescription(description);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !courseId) return;
    setIsUpdating(true);
    try {
      const result = await updateCourseAction(courseId, {
        courseName: editTitle.trim(),
        description: editDescription.trim(),
      });
      if (result.success) {
        setTitle(editTitle.trim());
        setDescription(editDescription.trim());
        setEditOpen(false);
        toast.success("Course updated!");
      } else {
        const err = result as Record<string, unknown>;
        if (err.errors) {
          toast.error(
            Object.values(err.errors as Record<string, string>).join(", "),
          );
        } else {
          toast.error((err.error as string) || "Failed to update course.");
        }
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!courseId) return;
    setIsDeleting(true);
    try {
      const result = await deleteCourseAction(courseId);
      if (result.success) {
        toast.success("Course deleted permanently.");
        setCourseId(null);
        setTitle("");
        setDescription("");
        setModules([]);
        setResources([]);
        setDeleteOpen(false);
      } else {
        toast.error(
          ((result as Record<string, unknown>).error as string) ||
            "Failed to delete course.",
        );
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!courseId) return;
    setIsTogglingPublic(true);
    try {
      const response = await fetch(`/api/course/${courseId}/publish`, {
        method: checked ? "POST" : "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update visibility");
      }
      const updated = await response.json();
      setIsPublic(updated.isPublic);
      setShareSlug(updated.shareSlug);
      toast.success(
        checked ? "Course is now publicly visible." : "Course is now private.",
      );
    } catch (error) {
      toast.error((error as Error).message || "Failed to update visibility.");
    } finally {
      setIsTogglingPublic(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!courseId) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/course/${courseId}/export/markdown`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        toast.error(error?.error || "Export failed.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "course"}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Markdown export downloaded.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-10">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-6 mt-16 sm:mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl border bg-muted flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">
                    {initialData?.courseId ? "Edit Course" : "Course Builder"}
                  </span>
                </div>
                <h1 className="break-words text-base font-bold leading-tight [overflow-wrap:anywhere] sm:text-xl">
                  {courseId ? title || "Untitled Course" : "New Course"}
                </h1>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-shrink-0">
              <PreviewDialog
                title={title}
                description={description}
                modules={modules}
                resources={resources}
              />
              {!courseId ? (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || isGenerating}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? "Saving…" : "Save draft"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || isGenerating}
                  variant={saved ? "outline" : "default"}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? "Saving…" : saved ? "Saved" : "Save"}
                </Button>
              )}
            </div>
          </div>

          {courseId && (
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              <StatPill icon={Layers} label="Modules" value={modules.length} />
              <StatPill icon={BookOpen} label="Lessons" value={totalLessons} />
              <StatPill
                icon={Paperclip}
                label="Resources"
                value={resources.length}
              />
            </div>
          )}
        </div>

        {!courseId && (
          <AiCourseGenerator
            disabled={isSaving}
            onGeneratingChange={setIsGenerating}
          />
        )}

        {/* ── Course Info Card ──────────────────────────────────────── */}
        {courseId ? (
          <Card className="mb-6 border shadow-none">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Course
                  </p>
                  <h2 className="break-words text-lg font-bold leading-snug">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1.5 break-words text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                  {initialData?.audience && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      For: {initialData.audience}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1 sm:mt-0.5 sm:flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Edit course"
                    onClick={openEditDialog}
                  >
                    <PenLine className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                    title="Delete course"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border shadow-none">
            <CardHeader className="pb-3 pt-5 px-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Or create a course manually
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="course-title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="course-title"
                  disabled={isGenerating}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mastering Modern Web Development"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-desc" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="course-desc"
                  disabled={isGenerating}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief overview of what learners will take away…"
                  className="min-h-20 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Main Tabs ────────────────────────────────────────────── */}
        <Tabs defaultValue="outline">
          <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="w-full max-w-full overflow-x-auto pb-1 sm:w-auto sm:pb-0">
              <TabsList className="h-9 w-max min-w-full border bg-muted/50 p-1 sm:min-w-0">
                <TabsTrigger
                  value="outline"
                  className="gap-1.5 text-xs h-7 px-3"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Outline
                </TabsTrigger>
                <TabsTrigger
                  value="resources"
                  className="gap-1.5 text-xs h-7 px-3"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Resources
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="gap-1.5 text-xs h-7 px-3"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="share" className="gap-1.5 text-xs h-7 px-3">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-w-full self-start overflow-x-auto sm:flex-shrink-0">
              <ToggleGroup
                type="single"
                value={outlineView}
                onValueChange={(v: string) => v && setOutlineView(v)}
                className="border rounded-lg p-0.5 bg-muted/40 gap-0"
              >
                <ToggleGroupItem
                  value="accordion"
                  size="sm"
                  className="gap-1.5 text-xs rounded-md h-7 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Accordion
                </ToggleGroupItem>
                <UpgradeDialog>
                  <ToggleGroupItem
                    value="flowmap"
                    size="sm"
                    className="gap-1.5 text-xs rounded-md h-7 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    asChild
                  >
                    <button>
                      <Workflow className="w-3.5 h-3.5" />
                      Flow Map
                      <Crown className="w-3 h-3 text-primary ml-0.5" />
                    </button>
                  </ToggleGroupItem>
                </UpgradeDialog>
              </ToggleGroup>
            </div>
          </div>

          <TabsContent value="outline">
            <OutlineTab
              courseId={courseId}
              modules={modules}
              resources={resources}
              setModules={setModules}
              setResources={setResources}
            />
          </TabsContent>

          <TabsContent value="resources">
            <ResourcesTab
              modules={modules}
              resources={resources}
              setResources={setResources}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab
              courseId={courseId}
              isPublic={isPublic}
              shareSlug={shareSlug}
              onTogglePublic={handleTogglePublic}
              isToggling={isTogglingPublic}
              onExportMarkdown={handleExportMarkdown}
              isExporting={isExporting}
            />
          </TabsContent>

          <TabsContent value="share">
            <ShareTab
              isPublic={isPublic}
              shareSlug={shareSlug}
              onTogglePublic={handleTogglePublic}
              isToggling={isTogglingPublic}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Edit Course Dialog ───────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>
              Update the course title and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-sm min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editTitle.trim() || isUpdating}
            >
              {isUpdating && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-lg">
                Delete this course?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{title}&rdquo;
              </span>
              , along with{" "}
              <span className="font-semibold text-foreground">
                {modules.length} {modules.length === 1 ? "module" : "modules"}
              </span>{" "}
              and{" "}
              <span className="font-semibold text-foreground">
                {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              )}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
