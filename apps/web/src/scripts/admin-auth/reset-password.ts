import { authClient } from "@/lib/auth-client";

const form = document.querySelector<HTMLFormElement>('[data-auth-page="reset-password"]');
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const successAlert = document.querySelector<HTMLElement>("[data-auth-success]");
let isSubmitting = false;

function readInput(id: string) {
  return form?.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
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

  submitButton.dataset.defaultLabel ||= submitButton.textContent ?? "Reset password";
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Saving..." : submitButton.dataset.defaultLabel;
}

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const token = readInput("token");
  const password = readInput("new-password");
  const confirmPassword = readInput("confirm-password");

  if (!token) {
    setError("This reset link is missing its token.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords must match.");
    return;
  }

  isSubmitting = true;
  setError(null);
  setSubmitState(true);

  try {
    const result = await authClient.resetPassword(
      {
        newPassword: password,
        token,
      },
      {
        onError(context) {
          setError(context.error.message);
        },
      },
    );

    if (result.data) {
      successAlert?.removeAttribute("hidden");

      if (form) {
        form.hidden = true;
      }

      return;
    }

    setError(result.error?.message ?? "Unable to reset this password.");
  } finally {
    isSubmitting = false;
    setSubmitState(false);
  }
}

form?.addEventListener("submit", (event) => {
  void handleSubmit(event);
});
