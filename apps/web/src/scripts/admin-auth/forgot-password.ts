import { authClient } from "@/lib/auth-client";

const form = document.querySelector<HTMLFormElement>('[data-auth-page="forgot-password"]');
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const successAlert = document.querySelector<HTMLElement>("[data-auth-success]");
let isSubmitting = false;

function readEmail() {
  return form?.querySelector<HTMLInputElement>("#email")?.value ?? "";
}

function setError(message: string | null) {
  const alert = form?.querySelector<HTMLElement>("[data-auth-error]");
  const alertMessage = alert?.querySelector<HTMLElement>("[data-auth-error-message]");

  if (!alert || !alertMessage) {
    return;
  }

  alertMessage.textContent = message ?? "";
  alert.hidden = !message;
}

function setSubmitState(isBusy: boolean) {
  if (!submitButton) {
    return;
  }

  submitButton.dataset.defaultLabel ||= submitButton.textContent ?? "Send reset link";
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Sending..." : submitButton.dataset.defaultLabel;
}

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  setError(null);
  setSubmitState(true);

  try {
    const result = await authClient.requestPasswordReset(
      {
        email: readEmail(),
        redirectTo: new URL("/admin/reset-password", window.location.origin).toString(),
      },
      {
        onError(context) {
          setError(context.error.message);
        },
      },
    );

    if (result.data) {
      successAlert?.removeAttribute("hidden");
      return;
    }

    setError(result.error?.message ?? "Unable to request a password reset link.");
  } finally {
    isSubmitting = false;
    setSubmitState(false);
  }
}

form?.addEventListener("submit", (event) => {
  void handleSubmit(event);
});
