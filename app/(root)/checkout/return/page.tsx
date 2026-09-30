import { Suspense } from "react";
import { CheckoutReturn } from "@/components/payments/CheckoutReturn";

export default function CheckoutReturnPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 pt-24">
      <Suspense fallback={<p role="status">Checking your subscription…</p>}>
        <CheckoutReturn />
      </Suspense>
    </section>
  );
}
