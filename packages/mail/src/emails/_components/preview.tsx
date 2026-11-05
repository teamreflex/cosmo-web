import type { NotificationItem } from "../../content";
import NotificationEmail from "../notification";
import { previewConfig, sampleItems, sampleManageUrl } from "./samples";

// one notification type's email on its own
export function typePreview(type: NotificationItem["type"]) {
  return () => (
    <NotificationEmail
      config={previewConfig}
      items={[sampleItems[type]]}
      manageUrl={sampleManageUrl}
    />
  );
}
