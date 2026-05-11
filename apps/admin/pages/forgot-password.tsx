import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CenteredCardPage } from "../components/centered-card-page";
import { authClient } from "../lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const redirectTo = new URL("/reset-password", window.location.origin).toString();
    const result = await authClient.requestPasswordReset(
      {
        email,
        redirectTo,
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

  return (
    <CenteredCardPage
      description="Enter the email address for your Datamix account and we’ll send a reset link if the account exists."
      label="Authentication"
      title="Reset your password"
    >
      {isSubmitted ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <AlertDescription className="text-emerald-800">
            If that email exists in Datamix, a reset link is on its way.
          </AlertDescription>
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href="/login">Back to login</a>
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </div>
        </form>
      )}
    </CenteredCardPage>
  );
}
