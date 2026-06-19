import { authClient } from "@/lib/auth-client";

const form = document.querySelector<HTMLFormElement>('[data-auth-page="setup"]');
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
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

  submitButton.dataset.defaultLabel ||= submitButton.textContent ?? "Create admin account";
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy
    ? "Creating admin..."
    : submitButton.dataset.defaultLabel;
}

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const password = readInput("password");
  const confirmPassword = readInput("confirm-password");

  if (password !== confirmPassword) {
    setError("Passwords must match.");
    return;
  }

  isSubmitting = true;
  setError(null);
  setSubmitState(true);

  let shouldRestoreForm = true;

  try {
    const result = await authClient.signUp.email(
      {
        email: readInput("email"),
        name: readInput("name"),
        password,
      },
      {
        onError(context) {
          setError(context.error.message);
        },
      },
    );

    if (result.data) {
      shouldRestoreForm = false;
      window.location.replace("/admin");
      return;
    }

    setError(result.error?.message ?? "Unable to create the first admin account.");
  } finally {
    if (shouldRestoreForm) {
      isSubmitting = false;
      setSubmitState(false);
    }
  }
}

form?.addEventListener("submit", (event) => {
  void handleSubmit(event);
});
