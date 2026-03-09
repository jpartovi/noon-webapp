"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { GoogleAccountList } from "@/components/google-account-list";
import { cn } from "@/lib/utils";

export default function OnboardingPage(_props: { params: Promise<unknown>; searchParams: Promise<unknown> }) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const user = useQuery(api.users.getMe);
  const googleAccounts = useQuery(api.users.listMyGoogleAccounts);
  const updateProfile = useMutation(api.users.updateProfile);
  const removeAccount = useMutation(api.users.removeGoogleAccount);
  const setPrimary = useMutation(api.users.setPrimaryGoogleAccount);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [step, setStep] = useState<"name" | "link-google">("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGoogle = (googleAccounts?.length ?? 0) > 0;

  useEffect(() => {
    if (user === undefined || googleAccounts === undefined) return;
    if (user?.isOnboarded) {
      router.replace("/");
      return;
    }
    if (user?.firstName) setFirstName(user.firstName);
    if (user?.lastName) setLastName(user.lastName);
    if (user?.firstName && user?.lastName) {
      setStep("link-google");
    }
  }, [user, googleAccounts, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setStep("link-google");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = async () => {
    setError(null);
    setLoading(true);
    try {
      await updateProfile({ isOnboarded: true });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finish");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = () => {
    setError(null);
    void signIn("google", { params: { redirectTo: "/onboarding" } })
      .then((result) => {
        if (result.redirect) window.location.href = result.redirect.toString();
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to link Google account. Please try again."
        );
      });
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {step === "name" ? "Step 2 of 3" : "Step 3 of 3"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === "name" ? "What's your name?" : "Link Google account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "name"
              ? "We'll use this so friends know who you are."
              : hasGoogle
                ? "You can add more accounts or continue to noon."
                : "Add at least one Google account to use calendar features."}
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {step === "name" && (
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                required
                disabled={loading}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                required
                disabled={loading}
                autoComplete="family-name"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        )}

        {step === "link-google" && (
          <div className="space-y-4">
            <GoogleAccountList
              googleAccounts={googleAccounts ?? []}
              primaryGoogleAccountId={user?.primaryGoogleAccountId}
              onConnect={handleLinkGoogle}
              onRemove={(accountId) => removeAccount({ accountId })}
              onSetPrimary={(accountId) => setPrimary({ accountId })}
            />
            {hasGoogle && (
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={finishOnboarding}
              >
                {loading ? "Saving…" : "Continue to noon"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={loading}
              onClick={() => setStep("name")}
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
