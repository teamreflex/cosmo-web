import UserCombobox from "@/components/admin/user-combobox";
import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import {
  cosmoLinkHistoryQuery,
  cosmoLinkHistorySearchQuery,
} from "@/lib/queries/cosmo-link-history";
import type {
  CosmoLinkHistoryAccount,
  CosmoLinkHistoryEntry,
} from "@/lib/universal/cosmo-link-history";
import type { CosmoLinkEvent } from "@apollo/database/web/types";
import { shortAddress } from "@apollo/util";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

const eventLabels = {
  linked: m.admin_accounts_history_event_linked,
  unlinked: m.admin_accounts_history_event_unlinked,
} satisfies Record<CosmoLinkEvent, () => string>;

const reasonLabels = {
  verified: m.admin_accounts_history_reason_verified,
  "account-deleted": m.admin_accounts_history_reason_account_deleted,
  "staff-move": m.admin_accounts_history_reason_staff_move,
} satisfies Record<CosmoLinkHistoryEntry["reason"]["kind"], () => string>;

/**
 * Finds a COSMO account whose link has changed and lists every Apollo account
 * it was linked to or unlinked from, newest first.
 */
export default function CosmoLinkHistoryCard() {
  const accountId = useId();
  const [account, setAccount] = useState<CosmoLinkHistoryAccount | null>(null);

  return (
    <Card className="@2xl:col-span-2">
      <CardHeader>
        <CardTitle>{m.admin_accounts_history_title()}</CardTitle>
        <CardDescription>
          {m.admin_accounts_history_description({
            appName: env.VITE_APP_NAME,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field className="max-w-md">
          <FieldLabel htmlFor={accountId}>
            {m.admin_accounts_history_account()}
          </FieldLabel>
          <UserCombobox
            id={accountId}
            value={account}
            onChange={setAccount}
            search={cosmoLinkHistorySearchQuery}
            getKey={(picked) => picked.address}
            getLabel={(picked) => picked.username}
            getSublabel={(picked) => shortAddress(picked.address)}
            getInitial={(picked) => picked.username.charAt(0).toUpperCase()}
            placeholder={m.admin_accounts_history_placeholder()}
          />
        </Field>
        {account !== null && <LinkHistory cosmoAccountId={account.id} />}
      </CardContent>
    </Card>
  );
}

function LinkHistory({ cosmoAccountId }: { cosmoAccountId: number }) {
  const { status, data } = useQuery(cosmoLinkHistoryQuery(cosmoAccountId));

  switch (status) {
    case "pending":
      return <Skeleton className="h-28 w-full rounded-md" />;
    case "error":
      return (
        <p className="text-sm text-destructive">
          {m.admin_accounts_history_error()}
        </p>
      );
    case "success":
      return (
        /* stacked rows in a narrow card, three columns once they fit */
        <div className="@container">
          <ol
            aria-label={m.admin_accounts_history_title()}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-md border text-sm @md:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            {data.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </ol>
        </div>
      );
  }
}

function HistoryRow({ entry }: { entry: CosmoLinkHistoryEntry }) {
  return (
    <li className="col-span-full grid grid-cols-subgrid items-center gap-y-1 border-b border-border/60 px-3 py-2.5 [grid-template-areas:'event_when'_'who_who'_'why_why'] last:border-b-0 @md:[grid-template-areas:'event_who_when'_'._why_.']">
      <StatusPill
        tone={entry.event === "linked" ? "fg" : "muted"}
        className="justify-self-start font-sans [grid-area:event]"
      >
        {eventLabels[entry.event]()}
      </StatusPill>

      <div className="flex min-w-0 items-center gap-2 [grid-area:who]">
        {entry.user.username === null ? (
          <>
            <UserAvatar deleted className="size-5.5" />
            <span className="truncate font-medium text-muted-foreground">
              {m.common_deleted_user()}
            </span>
          </>
        ) : (
          <>
            <UserAvatar
              username={entry.user.username}
              className="size-5.5 **:p-0.5"
            />
            <span className="truncate font-medium">@{entry.user.username}</span>
          </>
        )}
        {/* tells apart deleted accounts, which share a label */}
        <span className="font-mono text-xs text-muted-foreground">
          {entry.user.id.slice(0, 8)}
        </span>
      </div>

      <p className="min-w-0 text-xs break-words text-muted-foreground [grid-area:why]">
        {reasonLabels[entry.reason.kind]()}
        {entry.reason.kind === "staff-move" &&
          ` · ${entry.reason.staff === null ? m.common_deleted_user() : `@${entry.reason.staff}`}`}
      </p>

      <Timestamp
        date={entry.createdAt}
        format={{
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }}
        className="justify-self-end font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:when]"
      />
    </li>
  );
}
