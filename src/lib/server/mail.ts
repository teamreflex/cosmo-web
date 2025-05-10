import { env } from "@/env";
import { SES } from "@aws-sdk/client-ses";

const ses = new SES({
  region: env.MAIL_SES_REGION,
  credentials: {
    accessKeyId: env.MAIL_SES_ACCESS_KEY,
    secretAccessKey: env.MAIL_SES_SECRET_KEY,
  },
});

// format sender with friendly name
const MAIL_SENDER = `${env.NEXT_PUBLIC_APP_NAME} <${env.MAIL_SES_FROM}>`;

type EmailProps = {
  to: string;
  url: string;
  token: string;
};

/**
 * Send a verification email to the user upon changing email address.
 */
export async function sendEmailChangeVerification({ to, url }: EmailProps) {
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
      <p>Click the link below to verify your ${env.NEXT_PUBLIC_APP_NAME} email address.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Verify your ${env.NEXT_PUBLIC_APP_NAME} email`,
      },
    },
  });
}

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
      <p>Click the link below to verify your ${env.NEXT_PUBLIC_APP_NAME} email address.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>If you did not request this verification, please ignore this email.</p>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Verify your ${env.NEXT_PUBLIC_APP_NAME} email`,
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
      <p>Click the link below to reset your ${env.NEXT_PUBLIC_APP_NAME} password.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Reset your ${env.NEXT_PUBLIC_APP_NAME} password`,
      },
    },
  });
}

/**
 * Send a account deletion email to the user.
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
      <p>Click the link below to delete your ${env.NEXT_PUBLIC_APP_NAME} account.</p>
      <a href="${url}">${url}</a>
      <br />
      <p>This action cannot be undone.</p>
      <br />
      <p>Replies to this address are not monitored.</p>
    </body>
  </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Confirm ${env.NEXT_PUBLIC_APP_NAME} account deletion`,
      },
    },
  });
}
