import StaffUserName from "@/components/admin/staff-user-name";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { type StaffUser, staffUserText } from "@/lib/universal/staff-users";
import type { StoredReportReason } from "@apollo/database/web/types";
import type { ReactNode } from "react";

/**
 * A user named in a report's message, as message text and as the markup that
 * renders it; "Deleted user" once their account is gone. A queue row is a
 * link, so its names aren't, and are cut short with the full name on hover
 * since a COSMO username can be a 42-character address.
 */
export function nameInput(user: StaffUser | null, place: "row" | "detail") {
  const text =
    user === null ? m.admin_reports_deleted_user() : staffUserText(user);
  return {
    text,
    markup: ({ children }: { children?: ReactNode }) =>
      user === null ? (
        children
      ) : place === "row" ? (
        <span title={text} className="inline-flex max-w-40 align-bottom">
          <StaffUserName user={user} link={false} />
        </span>
      ) : (
        <StaffUserName user={user} className="font-medium text-foreground" />
      ),
  };
}

/**
 * Who opened a report, as nameInput names them. The dispute trade-timers
 * opens when a deadline passes has no reporter, and reads as the app.
 */
export function reporterInput(
  report: { reporter: StaffUser | null; reason: StoredReportReason },
  place: "row" | "detail",
) {
  return report.reporter === null && report.reason === "deadline_passed"
    ? {
        text: env.VITE_APP_NAME,
        markup: ({ children }: { children?: ReactNode }) => children,
      }
    : nameInput(report.reporter, place);
}
