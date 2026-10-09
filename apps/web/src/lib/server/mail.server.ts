import { env as clientEnv } from "@/lib/env/client";
import { env as serverEnv } from "@/lib/env/server";
import { SES } from "@aws-sdk/client-ses";

const ses = new SES({
  region: serverEnv.MAIL_SES_REGION,
  credentials: {
    accessKeyId: serverEnv.MAIL_SES_ACCESS_KEY,
    secretAccessKey: serverEnv.MAIL_SES_SECRET_KEY,
  },
});

// format sender with friendly name
const MAIL_SENDER = `${clientEnv.VITE_APP_NAME} <${serverEnv.MAIL_SES_FROM}>`;

type EmailProps = {
  to: string;
  url: string;
  token: string;
};

/**
 * Send a verification email to the user.
 */
export async function sendVerificationEmail({ to, url }: EmailProps) {
  await ses.sendEmail({
    Source: MAIL_SENDER,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
  <html>
    <body>
      <p>Click the link below to verify your ${clientEnv.VITE_APP_NAME} email address.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Verify your ${clientEnv.VITE_APP_NAME} email`,
      },
    },
  });
}

/**
 * Send a password reset email to the user.
 */
export async function sendPasswordResetEmail({ to, url }: EmailProps) {
  await ses.sendEmail({
    Source: MAIL_SENDER,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
  <html>
    <body>
      <p>Click the link below to reset your ${clientEnv.VITE_APP_NAME} password.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Reset your ${clientEnv.VITE_APP_NAME} password`,
      },
    },
  });
}

/**
 * Send an account deletion email to the user.
 */
export async function sendAccountDeletionEmail({ to, url }: EmailProps) {
  await ses.sendEmail({
    Source: MAIL_SENDER,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
  <html>
    <body>
      <p>Open the link below to confirm the deletion of your ${clientEnv.VITE_APP_NAME} account. Your account is deleted only once you confirm on that page.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>Deleting your account anonymises it: your name, email and socials are erased, and your lists, binders, pins and API keys are deleted. It can't be restored.</p>
      <p>The link expires in 24 hours. If you didn't ask to delete your account, ignore this email.</p>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Confirm ${clientEnv.VITE_APP_NAME} account deletion`,
      },
    },
  });
}
