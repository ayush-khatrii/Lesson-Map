"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ToggleCoursePublicButton({
  courseId,
  isPublic,
  shareSlug,
  canPublish,
}: {
  courseId: string;
  isPublic: boolean;
  shareSlug: string | null;
  canPublish: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      // An old public course may not have a slug yet. POST repairs it without
      // forcing the user to make the course private first.
      const publish = !isPublic || !shareSlug;
      const response = await fetch(`/api/course/${courseId}/publish`, {
        method: publish ? "POST" : "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update sharing.");
      }

      toast.success(
        publish
          ? shareSlug
            ? "Course is now public!"
            : "Share link created!"
          : "Course is now private.",
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || (!canPublish && !isPublic)}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isPublic && !shareSlug
        ? "Create Share Link"
        : isPublic
          ? "Make Private"
          : "Make Public"}
    </Button>
  );
}
