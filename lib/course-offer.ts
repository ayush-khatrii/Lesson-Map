import { z } from "zod";

export const DEFAULT_OFFER_LABEL = "Continue with the full course";
export function safeOfferUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export const courseOfferSchema = z
  .object({
    offerEnabled: z.boolean(),
    offerUrl: z.string().trim().max(2048).nullable(),
    offerHeading: z.string().trim().max(120).nullable(),
    offerDescription: z.string().trim().max(500).nullable(),
    offerButtonLabel: z.string().trim().max(80).nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.offerEnabled || value.offerUrl) &&
      !safeOfferUrl(value.offerUrl ?? "")
    )
      ctx.addIssue({
        code: "custom",
        path: ["offerUrl"],
        message:
          "Enter a valid HTTP or HTTPS sales-page URL without credentials.",
      });
  });
export type CourseOffer = z.infer<typeof courseOfferSchema>;
