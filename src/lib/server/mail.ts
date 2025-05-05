import { env } from "@/env";
import { SES } from "@aws-sdk/client-ses";

const ses = new SES({
  region: env.MAIL_SES_REGION,
  credentials: {
    accessKeyId: env.MAIL_SES_ACCESS_KEY,
    secretAccessKey: env.MAIL_SES_SECRET_KEY,
  },
});

type EmailProps = {
  to: string;
  url: string;
  token: string;
};

/**
 * Send a verification email to the user.
 */
export async function sendVerificationEmail({ to, url, token }: EmailProps) {
  await ses.sendEmail({
    Source: env.MAIL_SES_FROM,
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
      <p>Alternatively, you can use the following token to verify your email address: ${token}</p>
      <br />
      <p>If you did not request this verification, please ignore this email.</p>
    </body>
  </html>
	;`,
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
    Source: env.MAIL_SES_FROM,
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
    </body>
  </html>
	;`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Reset your ${env.NEXT_PUBLIC_APP_NAME} password`,
      },
    },
  });
}
