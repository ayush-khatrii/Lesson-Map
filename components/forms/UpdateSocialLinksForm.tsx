"use client";

import Link from "next/link";
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
  canUseSocialLinks,
}: {
  initialValues: Record<SocialFieldName, string>;
  canUseSocialLinks: boolean;
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
    if (!canUseSocialLinks || loading) return;
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
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      {!canUseSocialLinks && (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">Connect with learners beyond your course</p>
          <p className="mt-1 text-muted-foreground">Add your social profiles and website to public course pages with Creator. Saved links stay private while you are on Free.</p>
          <Button asChild className="mt-3"><Link href="/pricing">Unlock social links</Link></Button>
        </div>
      )}
      <fieldset disabled={!canUseSocialLinks || loading} className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon;
          const error = errors[field.name];
          const filled = values[field.name].trim().length > 0;
          return (
            <div key={field.name} className="space-y-1.5">
              <Label
                htmlFor={field.name}
                className="flex items-center gap-2 text-xs font-medium"
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
                    ? "h-10 rounded-md border-destructive bg-transparent px-3 shadow-none dark:bg-transparent"
                    : "h-10 rounded-md border-border bg-transparent px-3 shadow-none focus-visible:ring-primary/30 dark:bg-transparent"
                }
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={loading || !canUseSocialLinks}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save links
        </Button>
        <p className="text-xs text-muted-foreground">
          {!canUseSocialLinks ? "Social links are available on paid plans." : filledCount > 0
            ? `${filledCount} link${filledCount === 1 ? "" : "s"} set. These appear at the bottom of your public course pages.`
            : "Leave any field blank to hide that link."}
        </p>
      </div>
    </form>
  );
}
