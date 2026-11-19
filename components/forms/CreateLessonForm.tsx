"use client";

import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { IoSparklesSharp } from "react-icons/io5";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field";
import { createLessonsAction } from "@/lib/actions";

type LessonItem = {
  id: string;
  name: string;
  order: number;
};

type Module = {
  id: string;
  moduleName: string;
};

function SortableLessonItem({
  id,
  name,
  order,
  onDelete,
}: {
  id: string;
  name: string;
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
    <div className="flex items-stretch gap-3 w-full my-2">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="group flex-1 border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing bg-background"
      >
        <div className="flex items-start gap-3 w-full">
          <span className="text-muted-foreground font-medium w-5 text-center pt-1 text-xs">
            {order}
          </span>
          <div className="flex flex-col items-start w-full">
            <span className="font-medium text-sm">{name}</span>
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

export default function CreateLessonForm({ modules }: { modules: Module[] }) {
  const [selectedModule, setSelectedModule] = useState("");
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [newLesson, setNewLesson] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  function handleAddLesson() {
    if (!newLesson.trim()) {
      toast.error("Lesson name cannot be empty");
      return;
    }
    const nextOrder = lessons.length + 1;
    setLessons((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newLesson.trim(), order: nextOrder },
    ]);
    setNewLesson("");
  }

  function handleDeleteLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLessons((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex).map((l, i) => ({
        ...l,
        order: i + 1,
      }));
      return reordered;
    });
  }

  async function handleSubmit() {
    if (!selectedModule) {
      toast.error("Please select a module first");
      return;
    }

    if (lessons.length === 0) {
      toast.error("Add at least one lesson before saving");
      return;
    }
    setLoading(true);

    startTransition(async () => {
      const payload = {
        moduleId: selectedModule,
        lessons: lessons.map((l) => ({
          lessonName: l.name,
          order: l.order,
        })),
      };

      const res = await createLessonsAction(payload);

      if (res.success) {
        toast.success("Lessons created successfully!");
        setLessons([]);
        setSelectedModule("");
        setLoading(false);
      } else {
        console.error(res);
        toast.error(res.error || "Failed to create lessons");
      }
    });

  }

  function handleAIAssist() {
    setAiLoading(true);
    setTimeout(() => {
      setLessons([
        { id: "1", name: "What is Next.js?", order: 1 },
        { id: "2", name: "Server Components Explained", order: 2 },
        { id: "3", name: "Deploying Your Next.js App", order: 3 },
      ]);
      setAiLoading(false);
      toast.success("AI generated lesson outline ✨");
    }, 1000);
  }

  return (
    <div className="w-full mt-8 space-y-6 text-sm">
      {/* Header */}
      <div className="flex flex-col text-left sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Create Lessons for Modules</h2>
          <p className="text-sm text-muted-foreground">
            Add and reorder lessons for the selected module.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAIAssist}
          disabled={aiLoading}
          className="gap-2 text-xs px-3 w-fit"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <IoSparklesSharp className="h-3 w-3 text-primary-text" /> AI Assist
            </>
          )}
        </Button>
      </div>
      <FieldGroup>
        <FieldSet>
          <Field>
            <FieldLabel>Select Module</FieldLabel>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select module for lessons" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Lesson Name</FieldLabel>
            <Input
              value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)}
              placeholder="Enter lesson name"
            />
          </Field>

          <Button
            type="button"
            variant="secondary"
            onClick={handleAddLesson}
            disabled={!selectedModule || !newLesson}
            className="gap-2 text-xs mt-2"
          >
            <Plus className="h-3 w-3" /> Add Lesson
          </Button>
        </FieldSet>
      </FieldGroup>

      {/* Draggable List */}
      <div className="mt-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons} strategy={verticalListSortingStrategy}>
            {lessons.map((l) => (
              <SortableLessonItem
                key={l.id}
                id={l.id}
                name={l.name}
                order={l.order}
                onDelete={handleDeleteLesson}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full sm:w-auto px-5 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" /> Saving...
            </>
          ) : (
            "Save Lessons"
          )}
        </Button>
      </div>
    </div>
  );
}
