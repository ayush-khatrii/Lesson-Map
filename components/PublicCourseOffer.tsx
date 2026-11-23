"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_OFFER_LABEL, type CourseOffer } from "@/lib/course-offer";
import { trackCourseEvent } from "@/components/PublicCourseActions";

export default function PublicCourseOffer({
  offer,
  slug,
  isOwner,
}: {
  offer: CourseOffer;
  slug: string;
  isOwner: boolean;
}) {
  return (
    <section
      aria-label="Continue learning"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6"
    >
      <Card>
        <CardContent className="space-y-4">
          {offer.offerHeading && (
            <h2 className="text-xl font-semibold">{offer.offerHeading}</h2>
          )}
          {offer.offerDescription && (
            <p className="max-w-2xl whitespace-pre-wrap break-words text-muted-foreground">
              {offer.offerDescription}
            </p>
          )}
          <Button
            asChild
            className="h-auto min-h-10 max-w-full whitespace-normal text-center"
          >
            <a
              href={offer.offerUrl!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!isOwner) trackCourseEvent(slug, "paid_course_click");
              }}
            >
              {offer.offerButtonLabel || DEFAULT_OFFER_LABEL}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
