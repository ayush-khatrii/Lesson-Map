"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderModulesAction } from "@/lib/actions";
import { toast } from "sonner";

interface Lesson {
  id: string;
  lessonName: string;
}

interface Module {
  id: string;
  moduleName: string;
  description: string;
  order: number;
  Lesson: Lesson[];
}

interface SortableModuleItemProps {
  module: Module;
  index: number;
}

function SortableModuleItem({ module, index }: SortableModuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 bg-card rounded-xl border shadow-sm group"
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center text-sm font-semibold">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="mb-1 break-words text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-base">
          {module.moduleName}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {module.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {module.Lesson.length} {module.Lesson.length === 1 ? "lesson" : "lessons"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SortableModuleListProps {
  courseId: string;
  initialModules: Module[];
}

export default function SortableModuleList({
  courseId,
  initialModules,
}: SortableModuleListProps) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setModules(initialModules.sort((a, b) => a.order - b.order));
  }, [initialModules]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  }

  async function handleSaveOrder() {
    setIsSaving(true);
    const moduleIds = modules.map((m) => m.id);
    const result = await reorderModulesAction(courseId, moduleIds);

    if (result.success) {
      toast.success(result.message);
      setHasChanges(false);
    } else {
      toast.error(result.error);
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Reorder Modules</h3>
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Order
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={modules} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {modules.map((module, index) => (
              <SortableModuleItem
                key={module.id}
                module={module}
                index={index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modules.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
          No modules to reorder.
        </div>
      )}
    </div>
  );
}
