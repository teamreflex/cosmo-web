import {
  ActionButton,
  Layout,
  Note,
  Paragraph,
  PasteLink,
} from "./_components/layout";
import type { RenderConfig } from "./_components/layout";
import { previewConfig, previewUrl } from "./_components/samples";

type Props = { config: RenderConfig; url: string };

export default function AccountDeletionEmail({ config, url }: Props) {
  const text = `Use the button below to confirm the deletion of your ${config.appName} account. Your account is deleted only once you confirm on that page.`;
  return (
    <Layout config={config} preview={text}>
      <Paragraph>{text}</Paragraph>
      <ActionButton label="Confirm deletion" url={url} />
      <PasteLink url={url} />
      <Note>
        Deleting your account permanently deletes it, along with your lists,
        binders, pins and API keys. It can't be restored.
      </Note>
      <Note>
        The link expires in 24 hours. If you didn't ask to delete your account,
        ignore this email.
      </Note>
    </Layout>
  );
}

AccountDeletionEmail.PreviewProps = {
  config: previewConfig,
  url: previewUrl,
} satisfies Props;
