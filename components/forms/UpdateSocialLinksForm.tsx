"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSocialLinksAction } from "@/lib/actions";
import { updateSocialLinksSchema } from "@/lib/validation";
import {
  Github,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Save,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Labels, icons, and placeholders for every link we support. Add a row here and
// the form picks it up automatically.
const SOCIAL_FIELDS = [
  {
    name: "socialInstagram",
    label: "Instagram",
    icon: Instagram,
    placeholder: "instagram.com/yourname",
  },
  {
    name: "socialLinkedin",
    label: "LinkedIn",
    icon: Linkedin,
    placeholder: "linkedin.com/in/yourname",
  },
  {
    name: "socialYoutube",
    label: "YouTube",
    icon: Youtube,
    placeholder: "youtube.com/@yourchannel",
  },
  {
    name: "socialGithub",
    label: "GitHub",
    icon: Github,
    placeholder: "github.com/yourname",
  },
  {
    name: "socialTwitter",
    label: "X (Twitter)",
    icon: Twitter,
    placeholder: "x.com/yourname",
  },
  {
    name: "socialWebsite",
    label: "Website",
    icon: Globe,
    placeholder: "yoursite.com",
  },
] as const;

export type SocialFieldName = (typeof SOCIAL_FIELDS)[number]["name"];

export default function UpdateSocialLinksForm({
  initialValues,
}: {
  initialValues: Record<SocialFieldName, string>;
}) {
  const [values, setValues] = useState<Record<SocialFieldName, string>>(
    initialValues,
  );
  const [errors, setErrors] = useState<
    Partial<Record<SocialFieldName, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filledCount = SOCIAL_FIELDS.filter(
    (field) => values[field.name].trim().length > 0,
  ).length;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const parsed = updateSocialLinksSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<Record<SocialFieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as SocialFieldName;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      setLoading(false);
      toast.error("Please fix the highlighted links.");
      return;
    }

    try {
      const result = await updateSocialLinksAction(parsed.data);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else if (result.errors) {
        setErrors(result.errors as Partial<Record<SocialFieldName, string>>);
        toast.error("Please fix the highlighted links.");
      } else {
        toast.error(result.error || "Failed to save social links.");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon;
          const error = errors[field.name];
          const filled = values[field.name].trim().length > 0;
          return (
            <div key={field.name} className="space-y-1.5">
              <Label
                htmlFor={field.name}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Icon
                  className={
                    filled
                      ? "size-4 text-foreground"
                      : "size-4 text-muted-foreground"
                  }
                />
                {field.label}
              </Label>
              <Input
                id={field.name}
                value={values[field.name]}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [field.name]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                aria-invalid={Boolean(error)}
                className={
                  error
                    ? "h-11 rounded-xl border-destructive bg-background px-3 shadow-sm"
                    : "h-11 rounded-xl border-border bg-background px-3 shadow-sm focus-visible:ring-primary/30"
                }
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border/70 pt-5">
        <Button
          type="submit"
          disabled={loading}
          className="h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/85"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save links
        </Button>
        <p className="text-xs text-muted-foreground">
          {filledCount > 0
            ? `${filledCount} link${filledCount === 1 ? "" : "s"} set. These appear at the bottom of your public course pages.`
            : "Leave any field blank to hide that link."}
        </p>
      </div>
    </form>
  );
}
