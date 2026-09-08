import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignInFormSkeleton } from "@/components/navigation/PageSkeletons";

export default function SignInPage() {
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <Suspense fallback={<SignInFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
