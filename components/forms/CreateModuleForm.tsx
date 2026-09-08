"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field";
import { Loader2, Sparkles, Plus, Trash } from "lucide-react";
import { createModulesBulkSchema } from "@/lib/validation";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { startTransition, useState, useTransition } from "react";
import { createModulesAction } from "@/lib/actions";


type Course = {
  id: string;
  courseName: string;
};

type ModuleItem = {
  id: string;
  name: string;
  description: string;
  order: number;
};

function SortableItem({
  id,
  name,
  description,
  order,
  onDelete,
}: {
  id: string;
  name: string;
  description: string;
  order: number;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="flex items-stretch gap-3 w-full">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="group flex-1 border border-border rounded-lg p-3 mt-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing bg-background"
      >
        <div className="flex items-start gap-3 w-full">
          <span className="text-muted-foreground font-medium w-5 text-center pt-1 text-xs">
            {order}
          </span>
          <div className="flex flex-col items-start w-full">
            <span className="font-medium text-sm">{name}</span>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-lg"
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function CreateModuleForm({ courses }: { courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [newModule, setNewModule] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const mergedErrors = { ...formErrors };

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  function handleAddModule() {
    if (!newModule.trim() || !newModuleDescription.trim()) {
      setFormErrors({
        newModule: !newModule.trim() ? "Module name is required" : "",
        newModuleDescription: !newModuleDescription.trim() ? "Description is required" : "",
      });
      return;
    }

    const nextOrder = modules.length + 1;
    setModules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newModule.trim(),
        description: newModuleDescription.trim(),
        order: nextOrder,
      },
    ]);

    setNewModule("");
    setNewModuleDescription("");
    setFormErrors({});
  }

  function handleDeleteModule(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id));
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex).map((m, i) => ({ ...m, order: i + 1 }));
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const payload = {
      courseId: selectedCourse,
      modules: modules.map((m) => ({
        moduleName: m.name,
        description: m.description,
        order: m.order,
      })),
    };

    const validation = createModulesBulkSchema.safeParse(payload);
    if (!validation.success) {
      const zodErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        zodErrors[path] = issue.message;
      });
      setFormErrors(zodErrors);
      setLoading(false);
      return;
    }

    startTransition(async () => {
      const payload = {
        courseId: selectedCourse,
        modules: modules.map((m) => ({
          moduleName: m.name,
          description: m.description,
          order: m.order,
        })),
      };

      const res = await createModulesAction(payload);

      if (res.success) {
        toast.success("Modules created successfully!");
        setLoading(false);
      } else {
        console.error(res);
        toast.error(res.error || "Failed to create modules");
      }
    });
  };

  const handleAIAssist = () => {
    setAiLoading(true);
    setTimeout(() => {
      setModules([
        { id: "1", name: "Intro to Next.js 15", description: "Overview of new features.", order: 1 },
        { id: "2", name: "Server Components", description: "Understanding SSR and hydration.", order: 2 },
        { id: "3", name: "Database Integration", description: "Using Prisma with Next.js.", order: 3 },
      ]);
      setAiLoading(false);
    }, 800);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Create & Manage Modules</h2>
          <p className="text-xs text-muted-foreground">
            Add and reorder modules for your course.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAIAssist}
          disabled={aiLoading}
          className="gap-2 text-xs px-3"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 text-primary" /> AI Assist
            </>
          )}
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
        className="space-y-4 text-sm"
      >
        <FieldGroup>
          <FieldSet>
            <Field>
              <FieldLabel>Select Course</FieldLabel>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mergedErrors.courseId && (
                <p className="text-xs text-destructive mt-1">{mergedErrors.courseId}</p>
              )}
            </Field>

            <Field>
              <FieldLabel>Module Name</FieldLabel>
              <Input
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                placeholder="Enter module name"
                className="text-sm"
              />
              {mergedErrors.newModule && (
                <p className="text-xs text-destructive mt-1">{mergedErrors.newModule}</p>
              )}
            </Field>

            <Field>
              <FieldLabel>Module Description</FieldLabel>
              <Textarea
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="Enter module description"
                className="text-sm min-h-[90px]"
              />
              {mergedErrors.newModuleDescription && (
                <p className="text-xs text-destructive mt-1">{mergedErrors.newModuleDescription}</p>
              )}
            </Field>

            <Button
              disabled={!selectedCourse || !newModule}
              type="button"
              variant="secondary"
              onClick={handleAddModule}
              className="gap-2 text-xs mt-2"
            >
              <Plus className="h-3 w-3" /> Add Module
            </Button>
          </FieldSet>

          <div className="mt-5">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
              <SortableContext items={modules} strategy={verticalListSortingStrategy}>
                {modules.map((m) => (
                  <SortableItem
                    key={m.id}
                    id={m.id}
                    name={m.name}
                    description={m.description}
                    order={m.order}
                    onDelete={handleDeleteModule}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {mergedErrors.global && (
            <p className="text-xs text-destructive">{mergedErrors.global}</p>
          )}
        </FieldGroup>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto px-5 text-sm">
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" /> Saving...
              </>
            ) : (
              "Save Modules"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
