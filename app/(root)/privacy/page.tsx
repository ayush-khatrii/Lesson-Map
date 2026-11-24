import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY } from "@/components/legal/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What LessonMap collects, why we collect it, who processes it, and how you can access or delete your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      lastUpdated="November 24, 2026"
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
              as salted hashes rather than plain text. Passwords are processed when you sign in or
              change them. Social sign-in may store provider-issued tokens and account identifiers;
              we also keep session and password-reset verification records.
            </>,
            <>
              <strong className="text-foreground">Your content.</strong> Courses, modules, lessons,
              and the resources you attach to lessons, including notes, links, code, and uploaded
              files such as PDFs, images, documents, and spreadsheets.
            </>,
            <>
              <strong className="text-foreground">Profile links.</strong> Any social or website URLs
              you add in settings. These are optional and appear on your public course pages only if
              you leave them visible for that course.
            </>,
          ]}
        />
        <p>
          If you choose to sign up for updates on a public course page, we store your email address
          and signup date for that course after you agree to share your email with its creator.
          The creator can view and export this list to contact you about the course.
        </p>
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
              The generation record does not contain your raw prompt or the generated text.
              Successful generated or revised outlines are saved as course content in your account.
            </>,
            <>
              <strong className="text-foreground">Rate limiting data.</strong> A request key with a
              counter and timestamp, used to prevent brute-force sign-in attempts and runaway usage.
            </>,
            <>
              <strong className="text-foreground">Billing records.</strong> If you subscribe, we store
              a subscription identifier, a customer identifier, the product, the subscription status,
              the current period end, and whether it is set to cancel at the end of the period.
              We also keep payment identifiers and email delivery records to send receipts,
              renewal or expiry reminders, and cancellation messages, and to retry failed deliveries.
            </>,
            <>
              <strong className="text-foreground">Application logs.</strong> Our hosting provider
              processes request and error logs for debugging and security. We also record
              administrative security actions, such as administrator sign-ins.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cookies and browser storage">
        <p>
          We use essential authentication cookies to keep you signed in and support secure
          sign-in flows. Administrator access uses a separate session cookie. These cookies
          are not used for advertising.
        </p>
        <p>
          Your theme preference is saved in your browser&apos;s local storage. When you are signed
          in, we store your lesson progress in our database against your account, including lesson
          identifiers, start times, completion times, and update times. This lets you retrieve your
          progress when signed in on another browser or device. Guests can browse courses, but
          lesson progress is not saved without signing in.
        </p>
        <p>
          Public course pages use session storage for a randomly generated visitor identifier
          and flags that help count each visit, learning start, and paid-course link click once
          per visitor session per course. We send the identifier and event type to our server
          and store them with the course and event time. Creators receive aggregate counts
          for these events according to their plan. Signed-in owner activity is excluded.
          The counts describe recorded activity and can include repeat visitors across sessions.
        </p>
        <p>
          Earlier versions may have left lesson progress in local storage. The current progress
          feature does not read or import that data; you can remove it by clearing this site&apos;s
          browser storage. Clearing browser storage does not delete progress saved to your account.
          We do not use advertising cookies, cross-site trackers, or third-party analytics pixels.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use your information">
        <LegalList
          items={[
            "To create your account, sign you in, and keep your session secure.",
            "To store and display your courses, modules, lessons, and resources.",
            "To publish a course on a share link when you choose to make it public.",
            "To save and retrieve signed-in learners’ lesson progress across devices.",
            "To provide creators with public-course visits, learning starts, paid-course link click counts, and consent-based email signup lists according to their plan.",
            "To import available video details from public or unlisted YouTube playlists when you request an import.",
            "To send account, password-reset, and subscription-related emails.",
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
              your account, content, lesson progress, course events, and email signup lists are stored.
            </>,
            <>
              <strong className="text-foreground">Cloudflare R2</strong> — file storage for resources
              you upload, such as PDFs and images.
            </>,
            <>
              <strong className="text-foreground">DeepSeek</strong> — processes the topic, audience,
              and outline size you submit when you use AI generation. For AI revisions, we also
              send your revision instructions and relevant existing course content, including
              course and module descriptions and lesson titles.
            </>,
            <>
              <strong className="text-foreground">Dodo Payments</strong> — payment processing and
              subscription management, acting as merchant of record. Your card details go directly to
              them; <strong className="text-foreground">we never receive or store your full card
              number.</strong>
            </>,
            <>
              <strong className="text-foreground">GitHub and Google</strong> — only if you choose to
              sign in with those providers. Google also receives the playlist identifier when
              you request a YouTube playlist import so we can retrieve public playlist and video details.
            </>,
          ]}
        />
        <p>
          Resend processes recipient names, email addresses, message content, and attachments
          to deliver transactional emails when email delivery is configured. These include welcome,
          password-reset, and subscription messages, and payment receipts with invoice PDFs
          retrieved from Dodo Payments.
        </p>
        <p>
          Opening or previewing an external resource, or following a creator&apos;s social,
          website, or paid-course link, may share your IP address and browser details with
          that destination under its own privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="6. Public course pages">
        <p>
          When you turn on sharing for a course, anyone can view it, and search engines may
          index it. Other users may also copy the public outline into their own account. The
          public page shows the course content and your creator name, avatar, and any social links you
          enabled. It does not show your email address.
        </p>
        <p>
          You control sharing per course and can turn it off to stop public access through
          LessonMap. This does not remove copies already made by other people or cached by search
          engines. Your own signed-in owner preview can remain available.
        </p>
        <p>
          Creators can view aggregate visit and learning-start counts. Paid plans also provide
          email signup counts and recorded clicks on paid-course links. Click counts measure
          interaction with those links. Purchase confirmation is handled by the destination.
          Account-based lesson progress is saved for the signed-in learner. If you voluntarily submit your email
          for course updates, the creator receives
          that email and signup date. You can ask the creator to remove it or contact LessonMap
          using the address below. Turning off email collection does not delete existing signups
          or copies the creator has already exported.
        </p>
      </LegalSection>

      <LegalSection title="7. Retaining and deleting your data">
        <LegalList
          items={[
            "We keep account data, course content, saved lesson progress, and related service records while needed to provide the service and meet security or legal requirements.",
            "Deleting a course removes its modules, lessons, resource records, associated lesson progress, course events, and stored email signups. Unreferenced uploaded files are removed by the file-cleanup process rather than necessarily at the same time.",
            "Creators may retain exported signup lists outside LessonMap. Contact the creator about those copies.",
            "You can clear local and session storage in your browser. This does not remove data already stored on our servers.",
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
          We will update the date at the top of this page when this policy changes. Where required,
          we will provide additional notice or request consent for material changes to how we
          process personal data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
