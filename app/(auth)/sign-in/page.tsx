import { getAuthRedirect } from "@/lib/auth-redirect";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignInFormSkeleton } from "@/components/navigation/PageSkeletons";

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const { callbackUrl } = await searchParams;
    redirect(getAuthRedirect(typeof callbackUrl === "string" ? callbackUrl : null));
  }
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Suspense fallback={<SignInFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
