import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY,
  REFUND_WINDOW_DAYS,
} from "@/components/legal/config";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "How to request a refund or cancel a LessonMap subscription, and what happens to your access when you do.",
};

export default function RefundPage() {
  return (
    <LegalPage
      current="refund"
      title="Refund Policy"
      intro={`This policy explains when ${LEGAL_ENTITY} issues refunds for paid plans, and how to cancel a subscription you no longer want.`}
    >
      <LegalSection title="1. Your cancellation options">
        <p>
          You can cancel at any time from your account setting. When you cancel, your paid features
          remain available until the end of the billing period you have already paid for, then your
          account returns to the free plan. You will not be charged again.
        </p>
        <p>
          Because you keep access for the full period you paid for, cancelling does not automatically
          trigger a refund. If you would like money back as well, follow the refund steps below.
        </p>
      </LegalSection>

      <LegalSection title="2. Refund window">
        <LegalList
          items={[
            <>
              <strong className="text-foreground">First purchase.</strong> If you are not satisfied,
              request a refund within {REFUND_WINDOW_DAYS} days of your first payment and we will
              refund it in full.
            </>,
            <>
              <strong className="text-foreground">Renewals.</strong> Renewal payments are refundable
              within {REFUND_WINDOW_DAYS} days only if you have not used the paid features during that
              period — for example, if you meant to cancel but forgot. Contact us and we will review
              it.
            </>,
            <>
              <strong className="text-foreground">Unused time.</strong> We do not provide pro-rated
              refunds for partial months, or for periods you simply did not use.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. How to request a refund">
        <LegalList
          items={[
            <>
              Email{" "}
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Refund%20request`}
                className="font-medium text-foreground underline decoration-border underline-offset-4"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>{" "}
              from the address on your account.
            </>,
            "Include the approximate date of the payment and, if you have it, the payment or subscription reference.",
            "Tell us briefly what went wrong so we can fix it.",
            "We aim to respond within 3 business days.",
          ]}
        />
        <p>
          We are unable to process refunds for a payment made outside our service, or without a way to
          verify you as the account holder.
        </p>
      </LegalSection>

      <LegalSection title="4. What we do not refund">
        <LegalList
          items={[
            "Requests made after the refund window described above.",
            "Accounts suspended or closed for breaching our terms.",
            "Payments already refunded or disputed through your bank or card provider.",
            "Amounts other than the subscription fee itself, such as third-party fees charged by your own bank.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. How refunds are paid">
        <p>
          Payments are processed by <strong className="text-foreground">Dodo Payments</strong>, which
          acts as merchant of record for our subscriptions. Approved refunds are issued to the
          original payment method through Dodo Payments. Depending on your bank or card issuer, it can
          take 5 to 10 business days for the amount to appear.
        </p>
        <p>
          You may see a charge from Dodo Payments, or one of its payment partners, on your statement
          rather than {LEGAL_ENTITY}.
        </p>
      </LegalSection>

      <LegalSection title="6. Please contact us before disputing">
        <p>
          If something looks wrong with a charge, email us first. Most billing issues are a quick fix,
          and a refund request is nearly always faster than a chargeback. We reserve the right to close
          an account that files a chargeback for a payment we could have refunded directly.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to this policy">
        <p>
          We may update this policy. Material changes will be reflected in the date at the top of this
          page and will not apply to payments already made.
        </p>
        <p>
          See also our{" "}
          <Link
            href="/terms"
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline decoration-border underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
