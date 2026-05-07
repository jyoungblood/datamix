import {
  authEmailProviders,
  type AuthEmailProvider,
  type AuthEmailTemplate,
} from "@datamix/core";

import { AuthConfigError, type ApiBindings } from "./env";

type AuthEmailRuntime = {
  provider: AuthEmailProvider;
  fromEmail: string;
  fromName: string | null;
  replyToEmail: string | null;
  smtp:
    | {
        host: string;
        port: number;
        username: string;
        password: string;
        tls: "implicit" | "starttls";
      }
    | null;
  resend:
    | {
        apiKey: string;
      }
    | null;
};

type EmailContent = {
  html: string;
  subject: string;
  text: string;
};

type SendEmailInput = {
  html: string;
  subject: string;
  tags?: Array<{ name: string; value: string }> | undefined;
  text: string;
  to: string;
};

type RenderAuthEmailInput = {
  actionUrl: string;
  appName: string;
  inviterName?: string | null | undefined;
  recipientEmail: string;
  recipientName?: string | null | undefined;
  template: AuthEmailTemplate;
};

function isAuthEmailProvider(value: string): value is AuthEmailProvider {
  return authEmailProviders.includes(value as AuthEmailProvider);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function quoteHeaderValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function formatMailbox(email: string, name: string | null) {
  if (!name) {
    return `<${email}>`;
  }

  return `"${quoteHeaderValue(name)}" <${email}>`;
}

function parsePort(rawPort: string | undefined, fallback: number) {
  const port = Number(rawPort ?? fallback);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AuthConfigError("AUTH_SMTP_PORT must be a valid TCP port.");
  }

  return port;
}

let cloudflareConnectPromise:
  | Promise<typeof import("cloudflare:sockets").connect>
  | undefined;

async function loadCloudflareConnect() {
  cloudflareConnectPromise ??= import("cloudflare:sockets").then(
    (module) => module.connect,
  );

  return cloudflareConnectPromise;
}

function resolveAuthEmailRuntime(env: ApiBindings): AuthEmailRuntime {
  const providerValue = env.AUTH_EMAIL_PROVIDER?.trim().toLowerCase() ?? "";
  const fromEmail = env.AUTH_EMAIL_FROM_EMAIL?.trim();
  const fromName = env.AUTH_EMAIL_FROM_NAME?.trim() || null;
  const replyToEmail = env.AUTH_EMAIL_REPLY_TO_EMAIL?.trim() || null;

  if (!isAuthEmailProvider(providerValue)) {
    throw new AuthConfigError(
      "AUTH_EMAIL_PROVIDER must be set to either \"smtp\" or \"resend\" before using auth email flows.",
    );
  }

  if (!fromEmail) {
    throw new AuthConfigError(
      "AUTH_EMAIL_FROM_EMAIL is missing. Set it before using auth email flows.",
    );
  }

  if (providerValue === "smtp") {
    const host = env.AUTH_SMTP_HOST?.trim();
    const username = env.AUTH_SMTP_USERNAME?.trim();
    const password = env.AUTH_SMTP_PASSWORD?.trim();
    const tls = env.AUTH_SMTP_TLS?.trim().toLowerCase() === "implicit" ? "implicit" : "starttls";

    if (!host || !username || !password) {
      throw new AuthConfigError(
        "SMTP auth email delivery requires AUTH_SMTP_HOST, AUTH_SMTP_USERNAME, and AUTH_SMTP_PASSWORD.",
      );
    }

    return {
      provider: providerValue,
      fromEmail,
      fromName,
      replyToEmail,
      smtp: {
        host,
        port: parsePort(env.AUTH_SMTP_PORT, tls === "implicit" ? 465 : 587),
        username,
        password,
        tls,
      },
      resend: null,
    };
  }

  const apiKey = env.AUTH_RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new AuthConfigError(
      "Resend auth email delivery requires AUTH_RESEND_API_KEY.",
    );
  }

  return {
    provider: providerValue,
    fromEmail,
    fromName,
    replyToEmail,
    smtp: null,
    resend: {
      apiKey,
    },
  };
}

function renderEmailFrame(content: {
  bodyHtml: string;
  ctaLabel: string;
  heading: string;
  intro: string;
}) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px;background:#f4efe4;color:#1d1a14;font-family:Georgia,serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:640px;background:#fffdf8;border:1px solid rgba(73,54,24,0.12);border-radius:24px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7b6240;">Datamix</p>
                <h1 style="margin:0 0 16px;font-size:32px;line-height:1.05;">${content.heading}</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4d3c26;">${content.intro}</p>
                ${content.bodyHtml}
                <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#6b573d;">
                  If the button does not work, copy and paste the link into your browser.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderAuthEmail(input: RenderAuthEmailInput): EmailContent {
  const recipientName = input.recipientName?.trim() || input.recipientEmail;
  const safeRecipientName = escapeHtml(recipientName);
  const safeActionUrl = escapeHtml(input.actionUrl);
  const inviterLine = input.inviterName
    ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4d3c26;"><strong>${escapeHtml(
        input.inviterName,
      )}</strong> invited you to join ${escapeHtml(input.appName)}.</p>`
    : "";

  if (input.template === "invite") {
    const intro = `Hello ${safeRecipientName}, your Datamix account is ready. Set your password to accept the invite and enter the admin.`;
    const bodyHtml = `${inviterLine}
<p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4d3c26;">This invite was sent to ${escapeHtml(
      input.recipientEmail,
    )}. Once you choose a password, you can sign in right away.</p>
<p style="margin:0 0 24px;">
  <a href="${safeActionUrl}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#36240f;color:#fffaf0;text-decoration:none;">Accept invite</a>
</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:#6b573d;">This link opens the secure password setup flow for your invite.</p>`;

    return {
      subject: `You're invited to ${input.appName}`,
      text: [
        `Hello ${recipientName},`,
        "",
        input.inviterName
          ? `${input.inviterName} invited you to join ${input.appName}.`
          : `You were invited to join ${input.appName}.`,
        "",
        `Set your password here: ${input.actionUrl}`,
      ].join("\n"),
      html: renderEmailFrame({
        heading: "Accept your Datamix invite",
        intro,
        ctaLabel: "Accept invite",
        bodyHtml,
      }),
    };
  }

  const intro = `Hello ${safeRecipientName}, use the secure link below to choose a new password for ${escapeHtml(
    input.appName,
  )}.`;
  const bodyHtml = `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4d3c26;">If you asked to reset your password, continue with the button below.</p>
<p style="margin:0 0 24px;">
  <a href="${safeActionUrl}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#36240f;color:#fffaf0;text-decoration:none;">Reset password</a>
</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:#6b573d;">If you did not request this, you can safely ignore the message.</p>`;

  return {
    subject: `Reset your ${input.appName} password`,
    text: [
      `Hello ${recipientName},`,
      "",
      `Reset your password here: ${input.actionUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: renderEmailFrame({
      heading: "Reset your Datamix password",
      intro,
      ctaLabel: "Reset password",
      bodyHtml,
    }),
  };
}

function createMimeMessage(runtime: AuthEmailRuntime, input: SendEmailInput) {
  const boundary = `dmx-${crypto.randomUUID()}`;
  const lines = [
    `From: ${formatMailbox(runtime.fromEmail, runtime.fromName)}`,
    `To: <${input.to}>`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@datamix.local>`,
  ];

  if (runtime.replyToEmail) {
    lines.push(`Reply-To: <${runtime.replyToEmail}>`);
  }

  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/plain; charset="utf-8"');
  lines.push("Content-Transfer-Encoding: 8bit");
  lines.push("");
  lines.push(input.text);
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/html; charset="utf-8"');
  lines.push("Content-Transfer-Encoding: 8bit");
  lines.push("");
  lines.push(input.html);
  lines.push(`--${boundary}--`);
  lines.push("");

  return lines
    .join("\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

class SmtpSession {
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private socket: Socket;
  private buffer = "";

  constructor(socket: Socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async upgradeToTls() {
    this.writer.releaseLock();
    this.reader.releaseLock();
    this.socket = this.socket.startTls();
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
    this.buffer = "";
  }

  async send(command: string) {
    await this.writer.write(this.encoder.encode(`${command}\r\n`));
  }

  async sendRaw(data: string) {
    await this.writer.write(this.encoder.encode(data));
  }

  async readResponse() {
    const lines: string[] = [];

    while (true) {
      const line = await this.readLine();
      lines.push(line);

      if (line.length >= 4 && line[3] !== "-") {
        const code = Number(line.slice(0, 3));

        return {
          code,
          message: lines.join("\n"),
        };
      }
    }
  }

  async expect(command: string, expectedCodes: number[]) {
    await this.send(command);
    const response = await this.readResponse();

    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP ${command} failed: ${response.message}`);
    }

    return response;
  }

  async expectGreeting() {
    const response = await this.readResponse();

    if (response.code !== 220) {
      throw new Error(`SMTP greeting failed: ${response.message}`);
    }
  }

  async close() {
    try {
      await this.writer.close();
    } catch {
      // Ignore close failures while tearing down a failed SMTP session.
    }

    try {
      this.reader.releaseLock();
      this.writer.releaseLock();
    } catch {
      // Ignore release errors during shutdown.
    }

    await this.socket.close().catch(() => undefined);
  }

  private async readLine() {
    while (true) {
      const newlineIndex = this.buffer.indexOf("\n");

      if (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
        this.buffer = this.buffer.slice(newlineIndex + 1);
        return line;
      }

      const { done, value } = await this.reader.read();

      if (done) {
        if (this.buffer.length === 0) {
          throw new Error("SMTP connection closed unexpectedly.");
        }

        const line = this.buffer.replace(/\r$/, "");
        this.buffer = "";
        return line;
      }

      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }
}

async function sendViaSmtp(runtime: AuthEmailRuntime, input: SendEmailInput) {
  if (!runtime.smtp) {
    throw new AuthConfigError("SMTP provider was selected without SMTP configuration.");
  }

  const connect = await loadCloudflareConnect();
  const socket = connect(
    { hostname: runtime.smtp.host, port: runtime.smtp.port },
    {
      secureTransport: runtime.smtp.tls === "implicit" ? "on" : "starttls",
      allowHalfOpen: false,
    },
  );
  const session = new SmtpSession(socket);

  try {
    await session.expectGreeting();
    await session.expect("EHLO datamix.local", [250]);

    if (runtime.smtp.tls === "starttls") {
      await session.expect("STARTTLS", [220]);
      await session.upgradeToTls();
      await session.expect("EHLO datamix.local", [250]);
    }

    const authToken = btoa(
      `\u0000${runtime.smtp.username}\u0000${runtime.smtp.password}`,
    );
    await session.expect(`AUTH PLAIN ${authToken}`, [235]);
    await session.expect(`MAIL FROM:<${runtime.fromEmail}>`, [250]);
    await session.expect(`RCPT TO:<${input.to}>`, [250, 251]);
    await session.expect("DATA", [354]);

    const message = createMimeMessage(runtime, input);
    await session.sendRaw(`${message}\r\n.\r\n`);

    const dataResponse = await session.readResponse();

    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.message}`);
    }

    await session.expect("QUIT", [221]);
  } finally {
    await session.close();
  }
}

async function sendViaResend(runtime: AuthEmailRuntime, input: SendEmailInput) {
  if (!runtime.resend) {
    throw new AuthConfigError("Resend provider was selected without an API key.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.resend.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Datamix Auth Mailer",
    },
    body: JSON.stringify({
      from: formatMailbox(runtime.fromEmail, runtime.fromName),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: runtime.replyToEmail ?? undefined,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`Resend email send failed: ${response.status} ${errorBody}`);
  }
}

export async function sendAuthEmail(
  env: ApiBindings,
  input: RenderAuthEmailInput,
  tags?: Array<{ name: string; value: string }>,
) {
  const runtime = resolveAuthEmailRuntime(env);
  const rendered = renderAuthEmail(input);
  const payload: SendEmailInput = {
    to: input.recipientEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    tags,
  };

  if (runtime.provider === "smtp") {
    await sendViaSmtp(runtime, payload);
    return;
  }

  await sendViaResend(runtime, payload);
}
