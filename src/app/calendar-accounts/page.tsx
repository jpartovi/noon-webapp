"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "convex/_generated/api";
import { NavBar } from "@/components/nav-bar";
import { GoogleAccountList } from "@/components/google-account-list";

export default function CalendarAccountsPage(
  _props: { params: Promise<unknown>; searchParams: Promise<unknown> },
) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const user = useQuery(api.users.getMe);
  const googleAccounts = useQuery(api.users.listMyGoogleAccounts);
  const removeAccount = useMutation(api.users.removeGoogleAccount);
  const setPrimary = useMutation(api.users.setPrimaryGoogleAccount);

  const [error, setError] = useState<string | null>(null);

  if (user === undefined || googleAccounts === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user === null) {
    router.replace("/sign-in");
    return null;
  }

  const handleConnect = () => {
    setError(null);
    void signIn("google", { params: { redirectTo: "/calendar-accounts" } })
      .then((result) => {
        if (result.redirect)
          window.location.href = result.redirect.toString();
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect Google account. Please try again.",
        );
      });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Calendar Accounts
        </h1>

        {error && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Connected accounts
          </h2>
          <GoogleAccountList
            googleAccounts={googleAccounts}
            primaryGoogleAccountId={user.primaryGoogleAccountId}
            onConnect={handleConnect}
            onRemove={(accountId) => removeAccount({ accountId })}
            onSetPrimary={(accountId) => setPrimary({ accountId })}
          />
        </section>
      </main>
    </div>
  );
}
