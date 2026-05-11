import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CenteredCardPage } from "../components/centered-card-page";
import { authClient } from "../lib/auth-client";
import { buildDatamixAdminPath } from "../lib/runtime";

function readResetParams() {
  if (typeof window === "undefined") {
    return {
      email: "",
      error: "",
      mode: "reset",
      token: "",
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    email: searchParams.get("email") ?? "",
    error: searchParams.get("error") ?? "",
    mode: searchParams.get("mode") === "invite" ? "invite" : "reset",
    token: searchParams.get("token") ?? "",
  } as const;
}

export default function ResetPasswordPage() {
  const params = useMemo(readResetParams, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    params.error === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!params.token) {
      setErrorMessage("This reset link is missing its token.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await authClient.resetPassword(
      {
        newPassword: password,
        token: params.token,
      },
      {
        onError(context) {
          setErrorMessage(context.error.message);
        },
      },
    );

    setIsSubmitting(false);

    if (result.data) {
      setIsSubmitted(true);
    }
  };

  const heading =
    params.mode === "invite" ? "Accept your invite" : "Choose a new password";
  const description =
    params.mode === "invite"
      ? "Set your password to finish joining this Datamix instance."
      : "Choose a new password for your Datamix account.";
  const loginHref = params.email
    ? `${buildDatamixAdminPath("/login")}?email=${encodeURIComponent(params.email)}`
    : buildDatamixAdminPath("/login");

  return (
    <CenteredCardPage description={description} label="Authentication" title={heading}>
      {isSubmitted ? (
        <>
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
            <AlertDescription className="text-emerald-800">
              Sign in with your new password to continue.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <a href={loginHref}>Go to login</a>
          </Button>
        </>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              autoComplete="new-password"
              id="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              autoComplete="new-password"
              id="confirm-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={buildDatamixAdminPath("/login")}>Back to login</a>
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? "Saving..."
                : params.mode === "invite"
                  ? "Set password and continue"
                  : "Reset password"}
            </Button>
          </div>
        </form>
      )}
    </CenteredCardPage>
  );
}
