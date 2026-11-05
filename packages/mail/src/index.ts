import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import type { SESClientConfig } from "@aws-sdk/client-ses";
import { render, toPlainText } from "react-email";
import type { Mail } from "./content";
export type {
  Mail,
  MailObjekt,
  MailTradeSide,
  NotificationItem,
} from "./content";
export type { RenderConfig } from "./emails/_components/layout";
export { default as AccountDeletionEmail } from "./emails/account-deletion";
export { default as NotificationEmail } from "./emails/notification";
export { default as PasswordResetEmail } from "./emails/password-reset";
export { default as VerifyEmail } from "./emails/verify-email";
export { notificationSubject } from "./subject";

export type MailConfig = {
  // the sender's display name
  appName: string;
  // a verified SES identity in `region`
  from: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  // the floci docker service locally; undefined sends through real SES
  endpoint: string | undefined;
};

/**
 * Builds one SES client from the app's own env, so this package never reads
 * env itself.
 */
export function createMailer(config: MailConfig) {
  const clientConfig: SESClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
  if (config.endpoint !== undefined) {
    clientConfig.endpoint = config.endpoint;
  }
  const client = new SESClient(clientConfig);
  const source = `${config.appName} <${config.from}>`;

  return {
    /**
     * Renders the mail, with a plain-text part derived from its HTML, and
     * sends it to one recipient. Aborting `options.abortSignal` cancels the
     * request.
     */
    async send(mail: Mail, options?: { abortSignal?: AbortSignal }) {
      const html = await render(mail.body);
      await client.send(
        new SendEmailCommand({
          Source: source,
          Destination: { ToAddresses: [mail.to] },
          Message: {
            Subject: { Charset: "UTF-8", Data: mail.subject },
            Body: {
              Html: { Charset: "UTF-8", Data: html },
              Text: { Charset: "UTF-8", Data: toPlainText(html) },
            },
          },
        }),
        options,
      );
    },
  };
}
