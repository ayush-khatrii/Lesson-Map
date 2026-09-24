import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  LEGAL_SITE_URL,
} from "@/components/legal/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using LessonMap, including accounts, plans and billing, your content, and acceptable use.",
};

export default function TermsPage() {
  return (
    <LegalPage
      current="terms"
      title="Terms of Service"
      intro={`These terms are an agreement between you and ${LEGAL_ENTITY} for the use of our course planning and sharing service at ${LEGAL_SITE_URL}.`}
    >
      <LegalSection title="1. Accepting these terms">
        <p>
          By creating an account or using the service, you agree to these terms. If you do not agree,
          please do not use the service. If you use it on behalf of an organisation, you confirm you
          have authority to accept these terms for that organisation.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use the service">
        <p>
          You must be at least 13 years old, and old enough to enter a binding contract in your
          country. You are responsible for keeping your account credentials secure and for everything
          that happens under your account.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <LegalList
          items={[
            "Provide accurate information and keep it up to date.",
            "Do not share your account or transfer it to someone else.",
            "Tell us promptly if you believe your account has been compromised.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Plans, limits, and billing">
        <LegalList
          items={[
            <>
              The free plan allows a limited number of courses and AI generation attempts. Paid plans
              raise those limits. Current limits are shown on our{" "}
              <Link
                href="/pricing"
                className="font-medium text-foreground underline decoration-border underline-offset-4"
              >
                pricing page
              </Link>{" "}
              and may change with notice.
            </>,
            "Paid subscriptions renew automatically at the interval shown at checkout until you cancel.",
            "Payments are processed by Dodo Payments as merchant of record. Your payment is subject to their terms in addition to ours.",
            "When you cancel, your plan stays active until the end of the period you already paid for, and then reverts to the free plan. Access to paid features is not pro-rated.",
            "If a renewal payment fails, your paid features may be suspended until payment succeeds.",
            "We may change our prices. We will give notice before a change affects an existing subscription.",
          ]}
        />
        <p>
          For refunds, see our{" "}
          <Link
            href="/refund"
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            Refund Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>
          You keep ownership of the courses, lessons, notes, and files you create. To operate the
          service we need permission to store, process, and display that content — for example, to
          save your course, generate a share page, or serve a file you uploaded. That permission is
          limited to running and improving the service, and it ends when you delete the content or
          your account, except for copies we must retain for legal or backup reasons.
        </p>
        <p>
          You are responsible for your content. Do not upload material you do not have the right to
          share, and do not include other people&apos;s personal data without permission.
        </p>
      </LegalSection>

      <LegalSection title="6. Public sharing">
        <p>
          Sharing a course creates a link that anyone can open. You are responsible for deciding what
          you publish. Do not use public course pages to distribute confidential information, and
          remember that once a link is shared it may be copied or indexed before you turn sharing off.
        </p>
      </LegalSection>

      <LegalSection title="7. AI generation">
        <LegalList
          items={[
            "AI-generated outlines are drafts. They can be inaccurate, incomplete, or unsuitable for your purpose.",
            "You are responsible for reviewing, editing, and verifying anything you generate before you use or publish it.",
            "AI generation uses third-party models and may be unavailable or rate limited from time to time.",
            "Your plan determines how many generation attempts you receive per month. Attempts that fail may still count toward your allowance.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Break the law or infringe anyone's rights while using the service.",
            "Upload malware, or attempt to gain unauthorised access to our systems or another user's account or content.",
            "Scrape, overload, or resell the service, or bypass plan limits, rate limits, or authentication.",
            "Use the service to send spam, or to publish content that is unlawful, hateful, or harmful.",
            "Reverse engineer or copy the service, except where the law says you may.",
          ]}
        />
        <p>
          We may suspend or remove content, or suspend an account, if we reasonably believe it is
          being used in breach of these terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Availability and changes to the service">
        <p>
          We work to keep the service available, but we do not guarantee uninterrupted access. We may
          add, change, or remove features, and we may suspend the service for maintenance. We may also
          discontinue the service; if we do, we will give reasonable notice so you can export your
          content.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties
          of any kind to the fullest extent permitted by law. We do not warrant that the service will
          be error-free, that content will be accurate, or that your use of it will achieve a
          particular outcome. Nothing here excludes rights you have that cannot legally be excluded.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {LEGAL_ENTITY} is not liable for indirect,
          incidental, special, or consequential losses, or for lost profits, revenue, data, or
          goodwill. Our total liability for any claim relating to the service is limited to the amount
          you paid us in the twelve months before the claim. If you use the free plan, that amount is
          zero.
        </p>
      </LegalSection>

      <LegalSection title="12. Ending this agreement">
        <p>
          You may stop using the service and close your account at any time. We may suspend or end
          your access if you breach these terms, if we are required to by law, or if we discontinue
          the service. On termination, the sections that by their nature should survive — including
          content permissions you granted for retained records, disclaimers, and liability limits —
          will continue to apply.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These terms are governed by the laws of {LEGAL_JURISDICTION}, and the courts of that
          jurisdiction have exclusive jurisdiction over any dispute, unless mandatory local law gives
          you the right to bring a claim elsewhere.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to these terms">
        <p>
          We may update these terms. If a change is material, we will update the date at the top of
          this page and, where appropriate, notify you. Continuing to use the service after a change
          means you accept the updated terms.
        </p>
        <p>
          Questions? Email{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
