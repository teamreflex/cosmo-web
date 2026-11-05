import {
  ActionButton,
  Layout,
  Paragraph,
  PasteLink,
} from "./_components/layout";
import type { RenderConfig } from "./_components/layout";
import { previewConfig, previewUrl } from "./_components/samples";

type Props = { config: RenderConfig; url: string };

export default function PasswordResetEmail({ config, url }: Props) {
  const text = `Click the button below to reset your ${config.appName} password.`;
  return (
    <Layout config={config} preview={text}>
      <Paragraph>{text}</Paragraph>
      <ActionButton label="Reset password" url={url} />
      <PasteLink url={url} />
    </Layout>
  );
}

PasswordResetEmail.PreviewProps = {
  config: previewConfig,
  url: previewUrl,
} satisfies Props;
