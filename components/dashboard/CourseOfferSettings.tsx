"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_OFFER_LABEL, type CourseOffer } from "@/lib/course-offer";
import { toast } from "sonner";

export default function CourseOfferSettings({
  courseId,
  canUse,
  loadingPlan,
}: {
  courseId: string;
  canUse: boolean;
  loadingPlan: boolean;
}) {
  const id = useId();
  const [offer, setOffer] = useState<CourseOffer | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!canUse || loadingPlan) return;
    const controller = new AbortController();
    setOffer(null);
    setError("");
    fetch(`/api/course/${encodeURIComponent(courseId)}/offer`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Could not load offer.");
        setOffer(body);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [courseId, canUse, loadingPlan, attempt]);
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h3 className="font-semibold">Promote your paid course</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Offer learners a next step below your public curriculum.
        </p>
      </div>
      {loadingPlan ? (
        <p role="status">Checking plan…</p>
      ) : !canUse ? (
        <p className="text-sm">
          <Link href="/pricing" className="underline">
            Upgrade to Creator or Professional
          </Link>{" "}
          to add a paid-course offer.
        </p>
      ) : error ? (
        <div role="alert">
          {error}{" "}
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : !offer ? (
        <p role="status">Loading offer…</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              const response = await fetch(
                `/api/course/${encodeURIComponent(courseId)}/offer`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(offer),
                },
              );
              const body = await response.json();
              if (!response.ok)
                throw new Error(body.error || "Could not save offer.");
              toast.success("Course offer saved.");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not save offer.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <fieldset disabled={saving} className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id={`${id}-enabled`}
                checked={offer.offerEnabled}
                disabled={saving}
                onCheckedChange={(offerEnabled) =>
                  setOffer({ ...offer, offerEnabled })
                }
              />
              <label htmlFor={`${id}-enabled`}>
                Show offer on public curriculum
              </label>
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-url`}>Sales-page URL</label>
              <Input
                id={`${id}-url`}
                type="url"
                required={offer.offerEnabled}
                maxLength={2048}
                placeholder="https://example.com/my-course"
                value={offer.offerUrl ?? ""}
                onChange={(e) =>
                  setOffer({ ...offer, offerUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-heading`}>Heading (optional)</label>
              <Input
                id={`${id}-heading`}
                maxLength={120}
                value={offer.offerHeading ?? ""}
                onChange={(e) =>
                  setOffer({ ...offer, offerHeading: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-description`}>
                Description (optional)
              </label>
              <Textarea
                id={`${id}-description`}
                maxLength={500}
                value={offer.offerDescription ?? ""}
                onChange={(e) =>
                  setOffer({ ...offer, offerDescription: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-label`}>Button text</label>
              <Input
                id={`${id}-label`}
                maxLength={80}
                placeholder={DEFAULT_OFFER_LABEL}
                value={offer.offerButtonLabel ?? ""}
                onChange={(e) =>
                  setOffer({ ...offer, offerButtonLabel: e.target.value })
                }
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save offer"}
            </Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
