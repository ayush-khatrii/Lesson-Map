"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/lib/actions";
import { updateProfileSchema } from "@/lib/validation";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UpdateProfileForm({
  initialName,
}: {
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const result = updateProfileSchema.safeParse({ name });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Invalid name");
      setLoading(false);
      return;
    }

    try {
      const res = await updateProfileAction(result.data);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-medium">Display name</Label>
        <p className="text-xs leading-5 text-muted-foreground">This appears as the author name on your shared courses.</p>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-10 rounded-md border-border bg-transparent px-3 shadow-none focus-visible:ring-primary/30 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Changes
      </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-500" />Changes appear on your profile right away.</p>
      </div>
    </form>
  );
}
