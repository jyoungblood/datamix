import type { DatamixAuthProviderId } from "@datamix/core";

import { authClient } from "@/lib/auth-client";

const root = document.querySelector<HTMLElement>('[data-auth-page="login"]');
const form = root?.querySelector<HTMLFormElement>("form") ?? null;
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const providerButtons = root
  ? Array.from(root.querySelectorAll<HTMLButtonElement>("[data-auth-provider]"))
  : [];
let isSubmitting = false;
let activeProviderButton: HTMLButtonElement | null = null;

function readInput(id: string) {
  return root?.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
}

function readNextPath() {
  const configuredNextPath = root?.dataset.nextPath;

  if (configuredNextPath?.startsWith("/") && !configuredNextPath.startsWith("//")) {
    return configuredNextPath;
  }

  const nextPath = new URLSearchParams(window.location.search).get("next");

  return nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin";
}

function createCallbackUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

function setError(message: string | null) {
  const alert = root?.querySelector<HTMLElement>("[data-auth-error]");
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

  submitButton.dataset.defaultLabel ||= submitButton.textContent ?? "Sign in";
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy
    ? "Signing in..."
    : submitButton.dataset.defaultLabel;
}

function setProviderButtonsDisabled(disabled: boolean) {
  for (const button of providerButtons) {
    button.disabled = disabled;
  }
}

function setProviderState(button: HTMLButtonElement | null) {
  for (const providerButton of providerButtons) {
    providerButton.dataset.defaultLabel ||=
      providerButton.textContent ?? `Continue with ${providerButton.dataset.authProviderLabel}`;
    providerButton.disabled = Boolean(button);
    providerButton.textContent =
      button === providerButton
        ? `Redirecting to ${providerButton.dataset.authProviderLabel}...`
        : providerButton.dataset.defaultLabel;
  }

  activeProviderButton = button;
}

async function handleEmailSubmit(event: SubmitEvent) {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  setError(null);
  setSubmitState(true);
  setProviderButtonsDisabled(true);

  let shouldRestoreForm = true;

  try {
    const result = await authClient.signIn.email(
      {
        email: readInput("email"),
        password: readInput("password"),
        rememberMe: true,
      },
      {
        onError(context) {
          setError(context.error.message);
        },
      },
    );

    if (result.data) {
      shouldRestoreForm = false;
      window.location.replace(readNextPath());
      return;
    }

    setError(result.error?.message ?? "Unable to sign in with those credentials.");
  } finally {
    if (shouldRestoreForm) {
      isSubmitting = false;
      setSubmitState(false);
      setProviderButtonsDisabled(false);
    }
  }
}

async function handleSocialSignIn(button: HTMLButtonElement) {
  if (activeProviderButton || isSubmitting) {
    return;
  }

  const providerId = button.dataset.authProvider;

  if (!providerId) {
    return;
  }

  setError(null);
  setSubmitState(true);
  setProviderState(button);

  const nextPath = readNextPath();
  const callbackURL = createCallbackUrl(nextPath);
  const errorCallbackURL = createCallbackUrl(
    `/admin/login?next=${encodeURIComponent(nextPath)}`,
  );
  let shouldRestoreButtons = true;

  try {
    const result = await authClient.signIn.social(
      {
        callbackURL,
        disableRedirect: true,
        errorCallbackURL,
        provider: providerId as DatamixAuthProviderId,
      },
      {
        onError(context) {
          setError(context.error.message);
        },
      },
    );

    if (result.data?.url) {
      shouldRestoreButtons = false;
      window.location.assign(result.data.url);
      return;
    }

    setError(result.error?.message ?? "Unable to start OAuth sign-in.");
  } finally {
    if (shouldRestoreButtons) {
      setProviderState(null);
      setSubmitState(false);
    }
  }
}

form?.addEventListener("submit", (event) => {
  void handleEmailSubmit(event);
});

for (const button of providerButtons) {
  button.addEventListener("click", () => {
    void handleSocialSignIn(button);
  });
}
