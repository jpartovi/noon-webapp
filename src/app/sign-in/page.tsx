"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SignInPage(_props: { params: Promise<unknown>; searchParams: Promise<unknown> }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("phone", {
        phone: phone.trim(),
      });
      if (result.redirect) {
        window.location.href = result.redirect.toString();
        return;
      }
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("phone", {
        phone: phone.trim(),
        code: code.trim(),
      });
      if (result.redirect) {
        window.location.href = result.redirect.toString();
        return;
      }
      if (result.signingIn) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      setError("Verification did not complete. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step 1 of 3
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">noon</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to see when your people are free
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

        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                required
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send verification code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code sent to {phone}. Enter it below.
            </p>
            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                required
                disabled={loading}
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
