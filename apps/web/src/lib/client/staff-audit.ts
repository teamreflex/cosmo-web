import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { banLengthLabel } from "@/lib/client/reports";
import { banLengthOptions } from "@/lib/universal/reports";
import type { StaffAuditAction } from "@apollo/database/web/types";

const actionLabels = {
  "report:read": m.admin_audit_action_report_read,
  "report:resolve": m.admin_audit_action_report_resolve,
  "report:dismiss": m.admin_audit_action_report_dismiss,
  "report:escalate": m.admin_audit_action_report_escalate,
  "user:ban": m.admin_audit_action_user_ban,
  "user:unban": m.admin_audit_action_user_unban,
  "user:set-role": m.admin_audit_action_user_set_role,
  "api-key:create": m.admin_audit_action_api_key_create,
  "api-key:update": m.admin_audit_action_api_key_update,
  "api-key:delete": m.admin_audit_action_api_key_delete,
  "metadata:update": m.admin_audit_action_metadata_update,
  "trade:dispute": m.admin_audit_action_trade_dispute,
  "trade:complete": m.admin_audit_action_trade_complete,
  "trade:cancel": m.admin_audit_action_trade_cancel,
  "trade:extend": m.admin_audit_action_trade_extend,
  "trade:remove-message": m.admin_audit_action_trade_remove_message,
  "feedback:remove": m.admin_audit_action_feedback_remove,
} satisfies Record<StaffAuditAction, () => string>;

/**
 * Describes an audit action code in words; the log itself shows the code.
 */
export function auditActionLabel(action: StaffAuditAction): string {
  return actionLabels[action]();
}

/**
 * A ban's length as the Ban dialog names it. Other lengths only come from
 * direct API calls, so they get a plain day or hour count.
 */
export function auditBanLength(expiresIn: number | null): string {
  if (expiresIn === null) {
    return banLengthLabel("permanent");
  }

  const option = banLengthOptions.find(
    (option) => option.seconds === expiresIn,
  );
  if (option) {
    return banLengthLabel(option.value);
  }

  const unit = expiresIn >= 86_400 ? "day" : "hour";
  return new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit,
    unitDisplay: "long",
    maximumFractionDigits: 0,
  }).format(expiresIn / (unit === "day" ? 86_400 : 3600));
}
