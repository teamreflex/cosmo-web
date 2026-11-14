import {
  ActionButton,
  Layout,
  Note,
  Paragraph,
  PasteLink,
} from "./_components/layout";
import type { RenderConfig } from "./_components/layout";
import { previewConfig, previewUrl } from "./_components/samples";

type Props = { config: RenderConfig; url: string; newEmail: string };

/**
 * The email Better Auth sends to an account's current, verified address when
 * its owner asks to change it. Confirming sends the verification email to the
 * new address.
 */
export default function EmailChangeEmail({ config, url, newEmail }: Props) {
  const text = `Use the button below to confirm changing your ${config.appName} email address to ${newEmail}.`;
  return (
    <Layout config={config} preview={text}>
      <Paragraph>{text}</Paragraph>
      <ActionButton label="Confirm email change" url={url} />
      <PasteLink url={url} />
      <Note>
        Once you confirm, we'll send a verification link to the new address.
        Your email changes only when that link is opened.
      </Note>
      <Note>
        The link expires in 1 hour. If you didn't ask to change your email,
        ignore this email and your address won't change. The request came from a
        signed-in session of your account, so make sure nobody else has access
        to it.
      </Note>
    </Layout>
  );
}

EmailChangeEmail.PreviewProps = {
  config: previewConfig,
  url: previewUrl,
  newEmail: "new-address@example.com",
} satisfies Props;
