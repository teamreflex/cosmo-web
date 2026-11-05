import {
  ActionButton,
  Layout,
  Paragraph,
  PasteLink,
} from "./_components/layout";
import type { RenderConfig } from "./_components/layout";
import { previewConfig, previewUrl } from "./_components/samples";

type Props = { config: RenderConfig; url: string };

/**
 * The email Better Auth sends to verify an address, at sign-up and when the
 * address changes.
 */
export default function VerifyEmail({ config, url }: Props) {
  const text = `Click the button below to verify your ${config.appName} email address.`;
  return (
    <Layout config={config} preview={text}>
      <Paragraph>{text}</Paragraph>
      <ActionButton label="Verify email" url={url} />
      <PasteLink url={url} />
    </Layout>
  );
}

VerifyEmail.PreviewProps = {
  config: previewConfig,
  url: previewUrl,
} satisfies Props;
