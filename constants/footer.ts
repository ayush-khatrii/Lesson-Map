import { SUPPORT_EMAIL } from "@/constants/email";
import { POLICY_LINKS } from "@/components/legal/config";
import { SITE_NAME } from "@/lib/site";

export const FOOTER = {
  brand: { name: SITE_NAME, href: "/", logoSrc: "/lm-logo.png" },
  description:
    "A clear workspace for planning courses, organizing learning resources, and sharing knowledge.",
  sections: [
    {
      title: "Product",
      links: [
        { label: "Examples", href: "/examples" },
        { label: "Pricing", href: "/pricing" },
        { label: "About LessonMap", href: "/about" },
        { label: "Get started", href: "/start" },
      ],
    },
    { title: "Legal", links: POLICY_LINKS },
    {
      title: "Socials",
      links: [
        {
          label: "GitHub",
          href: "https://github.com/ayush-khatrii/Lesson-Map",
        },
        { label: "Personal website", href: "https://ayushkhatri.in/" },
        { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
      ],
    },
  ],
  copyrightSymbol: "©",
  copyright: `${SITE_NAME}. All rights reserved.`,
  tagline: "Plan with clarity. Teach with confidence.",
} as const;
