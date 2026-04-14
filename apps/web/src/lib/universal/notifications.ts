import type { NotificationPayload } from "@apollo/database/web/types";

export type NotificationListItem = {
  id: string;
  createdAt: string;
  type: "list_match";
  payload: NotificationPayload;
  readAt: string | null;
  sourceUsername: string | null;
};
