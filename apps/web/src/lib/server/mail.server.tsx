import { env as clientEnv } from "@/lib/env/client";
import { env as serverEnv } from "@/lib/env/server";
import { baseUrl } from "@/lib/utils";
import {
  AccountDeletionEmail,
  createMailer,
  PasswordResetEmail,
  VerifyEmail,
} from "@apollo/mail";
import type { RenderConfig } from "@apollo/mail";

const config = {
  appName: clientEnv.VITE_APP_NAME,
  logoUrl: `${baseUrl()}/email/logo.png`,
} satisfies RenderConfig;

const mailer = createMailer({
  appName: config.appName,
  from: serverEnv.MAIL_SES_FROM,
  region: serverEnv.MAIL_SES_REGION,
  accessKeyId: serverEnv.MAIL_SES_ACCESS_KEY,
  secretAccessKey: serverEnv.MAIL_SES_SECRET_KEY,
  endpoint: serverEnv.MAIL_SES_ENDPOINT,
});

type EmailProps = {
  to: string;
  url: string;
  token: string;
};

/**
 * Send a verification email to the user.
 */
export async function sendVerificationEmail({ to, url }: EmailProps) {
  await mailer.send({
    to,
    subject: `Verify your ${config.appName} email`,
    body: <VerifyEmail config={config} url={url} />,
  });
}

/**
 * Send a password reset email to the user.
 */
export async function sendPasswordResetEmail({ to, url }: EmailProps) {
  await mailer.send({
    to,
    subject: `Reset your ${config.appName} password`,
    body: <PasswordResetEmail config={config} url={url} />,
  });
}

/**
 * Send an account deletion email to the user.
 */
export async function sendAccountDeletionEmail({ to, url }: EmailProps) {
  await mailer.send({
    to,
    subject: `Confirm ${config.appName} account deletion`,
    body: <AccountDeletionEmail config={config} url={url} />,
  });
}
