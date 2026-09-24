import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY } from "@/components/legal/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What LessonMap collects, why we collect it, who processes it, and how you can access or delete your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      title="Privacy Policy"
      intro={`This policy explains what ${LEGAL_ENTITY} collects when you use our course planning and sharing service, why we need it, and the choices you have.`}
    >
      <LegalSection title="1. Information you give us">
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Account details.</strong> Your name, email address,
              and a profile image. If you sign in with GitHub or Google, we receive your name, email
              address, and avatar from that provider.
            </>,
            <>
              <strong className="text-foreground">Authentication data.</strong> Passwords are stored
              only as a salted hash — we never see or keep your plain password. When you use a social
              sign-in, we store the access tokens the provider issues so your session keeps working.
            </>,
            <>
              <strong className="text-foreground">Your content.</strong> Courses, modules, lessons,
              and the resources you attach to lessons, including notes, links, code, and uploaded
              files such as PDFs and images.
            </>,
            <>
              <strong className="text-foreground">Profile links.</strong> Any social or website URLs
              you add in settings. These are optional and appear on your public course pages only if
              you leave them visible for that course.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Information created by using the service">
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Session data.</strong> We record sessions,
              including the IP address and browser user agent attached to them, so we can keep you
              signed in and detect abuse.
            </>,
            <>
              <strong className="text-foreground">AI generation records.</strong> When you generate a
              course with AI we store the request identifier, a one-way hash of your request, the
              status, the number of tokens used, and a timestamp.{" "}
              <strong className="text-foreground">
                We do not store the prompt you typed or the generated outline text.
              </strong>
            </>,
            <>
              <strong className="text-foreground">Rate limiting data.</strong> A request key with a
              counter and timestamp, used to prevent brute-force sign-in attempts and runaway usage.
            </>,
            <>
              <strong className="text-foreground">Billing records.</strong> If you subscribe, we store
              a subscription identifier, a customer identifier, the product, the subscription status,
              the current period end, and whether it is set to cancel at the end of the period.
            </>,
            <>
              <strong className="text-foreground">Application logs.</strong> Our hosting provider
              keeps short-lived logs of requests and errors for debugging and security.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cookies and local storage">
        <p>
          We use a single essential cookie to keep you signed in. It is required for the service to
          work and is not used for advertising.
        </p>
        <p>
          Your theme preference and your lesson progress are saved in your browser&apos;s local
          storage. Lesson progress never leaves your device — it is not uploaded to us, which also
          means it is not attached to your account and will not follow you to another browser.
        </p>
        <p>
          We do not use advertising cookies, cross-site trackers, or third-party analytics pixels.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use your information">
        <LegalList
          items={[
            "To create your account, sign you in, and keep your session secure.",
            "To store and display your courses, modules, lessons, and resources.",
            "To publish a course on a share link when you choose to make it public.",
            "To generate course outlines when you request them and enforce your plan limits.",
            "To charge for paid plans, verify payments, and manage subscriptions and refunds.",
            "To prevent abuse, including rate limiting and protecting against unauthorised access.",
            "To diagnose faults and improve reliability.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Service providers we share data with">
        <p>
          We share only what each provider needs to perform its role. We do not sell your personal
          data.
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Vercel</strong> — application hosting and request
              logs.
            </>,
            <>
              <strong className="text-foreground">Neon</strong> — managed PostgreSQL database where
              your account and content are stored.
            </>,
            <>
              <strong className="text-foreground">Cloudflare R2</strong> — file storage for resources
              you upload, such as PDFs and images.
            </>,
            <>
              <strong className="text-foreground">DeepSeek</strong> — processes the topic, audience,
              and outline size you submit when you use AI generation.
            </>,
            <>
              <strong className="text-foreground">Dodo Payments</strong> — payment processing and
              subscription management, acting as merchant of record. Your card details go directly to
              them; <strong className="text-foreground">we never receive or store your full card
              number.</strong>
            </>,
            <>
              <strong className="text-foreground">GitHub and Google</strong> — only if you choose to
              sign in with those providers.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Public course pages">
        <p>
          When you turn on sharing for a course, anyone with the link can view that course. The
          public page shows the course content and your creator name, avatar, and any social links you
          enabled. It does not show your email address.
        </p>
        <p>
          You control this per course and can turn sharing off at any time, which immediately stops
          the link from working.
        </p>
      </LegalSection>

      <LegalSection title="7. Retaining and deleting your data">
        <LegalList
          items={[
            "We keep your account and content while your account is active.",
            "Deleting a course removes its modules, lessons, and resources, and we clean up the associated stored files.",
            "Billing records may be kept for as long as tax and accounting rules require, even after you close your account.",
            "You can ask us to access, correct, export, or delete your personal data by emailing us.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          Data is encrypted in transit. Access to your courses is checked on the server, and uploaded
          files are served through short-lived signed links rather than public URLs. No system is
          perfectly secure, so please use a strong, unique password and tell us promptly if you
          suspect unauthorised access.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          The service is not intended for children under 13, and we do not knowingly collect their
          personal data. If you believe a child has provided us with personal data, contact us and we
          will remove it.
        </p>
      </LegalSection>

      <LegalSection title="10. International transfers and your rights">
        <p>
          Our providers operate globally, so your data may be processed in countries other than your
          own. Depending on where you live, you may have rights to access, correct, delete, restrict,
          or port your data, and to object to certain processing.
        </p>
        <p>
          To make a request, email{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . You can also manage your profile and social links directly in{" "}
          <Link
            href="/settings"
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            settings
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          If we make material changes we will update the date at the top of this page. Continued use
          of the service after a change means you accept the updated policy.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
