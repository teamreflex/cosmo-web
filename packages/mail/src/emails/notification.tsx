import { Fragment } from "react";
import { Hr, Link } from "react-email";
import type { NotificationItem } from "../content";
import { Layout } from "./_components/layout";
import type { RenderConfig } from "./_components/layout";
import {
  itemLine,
  NotificationItemView,
} from "./_components/notification-items";
import {
  previewConfig,
  sampleItems,
  sampleManageUrl,
} from "./_components/samples";

type Props = {
  config: RenderConfig;
  // most urgent first: the first sets the subject and the inbox preview
  items: [NotificationItem, ...NotificationItem[]];
  manageUrl: string;
};

/**
 * One user's notifications from one send-notification-emails run, most
 * urgent first, divided by rules.
 */
export default function NotificationEmail({ config, items, manageUrl }: Props) {
  return (
    <Layout
      config={config}
      preview={`${itemLine(items[0], config.appName)}.`}
      footer={
        <Link href={manageUrl} className="text-muted underline">
          Manage email notifications
        </Link>
      }
    >
      {items.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 ? <Hr className="my-6 border-line" /> : null}
          <NotificationItemView item={item} config={config} />
        </Fragment>
      ))}
    </Layout>
  );
}

// a burst rolled up into one email
NotificationEmail.PreviewProps = {
  config: previewConfig,
  items: [
    sampleItems.offer_accepted,
    sampleItems.offer_received,
    sampleItems.offer_countered,
  ],
  manageUrl: sampleManageUrl,
} satisfies Props;
