import { m } from "@/i18n/messages";
import {
  formatScore,
  ratedRoleLabels,
  roleListingTypes,
} from "@/lib/client/feedback";
import { partyName } from "@/lib/client/trade-listings";
import { feedbackKey } from "@/lib/queries/feedback";
import type { FeedbackProfileEntry } from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import { isEqual } from "@apollo/util";
import { IconDots } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import ReportFeedbackDialog from "../reports/report-feedback-dialog";
import ListingTypeBadge from "../trade-listings/listing-type-badge";
import { PartyLink } from "../trades/trade-header";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Timestamp } from "../ui/timestamp";
import { FeedbackComment } from "./feedback-text";
import RatingIcon from "./rating-icon";
import RemoveFeedbackDialog from "./remove-feedback-dialog";

/**
 * Who is reading the page: their user id, and whether they may remove
 * feedback. Null when signed out.
 */
export type FeedbackViewer = {
  userId: string;
  // the COSMO address they link, which a rating keeps after its party relinks
  address: string | null;
  canRemove: boolean;
} | null;

type Props = {
  entry: FeedbackProfileEntry;
  /** the profile's address, whose page refetches after an action */
  address: string;
  /** the profile's name, who was rated */
  ownerName: string;
  viewer: FeedbackViewer;
  /** whether the profile was rated in more than one role */
  showRole: boolean;
};

/**
 * The table's columns from lg: sign, comment, rater, the role while ratings
 * span more than one, listing, time and menu. Cells name their column, as a
 * rating without a listing or a menu leaves its cell empty.
 */
const entryColumns = {
  role: {
    grid: "lg:grid-cols-[1.25rem_minmax(0,1fr)_13rem_7rem_7rem_7rem_2rem]",
    role: "lg:col-start-4",
    listing: "lg:col-start-5",
    time: "lg:col-start-6",
    menu: "lg:col-start-7",
  },
  plain: {
    grid: "lg:grid-cols-[1.25rem_minmax(0,1fr)_13rem_7rem_7rem_2rem]",
    role: undefined,
    listing: "lg:col-start-4",
    time: "lg:col-start-5",
    menu: "lg:col-start-6",
  },
};

/**
 * One rating on the feedback page: its sign, any comment, whether it counts,
 * when it was left, who left it with their own score, the role the profile
 * was rated in and its listing. Its menu holds what the viewer may do with
 * it. One line from lg, two below it.
 */
export default function FeedbackEntry({
  entry,
  address,
  ownerName,
  viewer,
  showRole,
}: Props) {
  const [reporting, setReporting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const queryClient = useQueryClient();

  /**
   * A rating's rater can't report it, and neither party may remove it. The
   * viewer's own address counts as the rated party too, which they still
   * are after relinking it to a new account.
   */
  const isRater = viewer !== null && viewer.userId === entry.rater.user?.id;
  const canReport = viewer !== null && !isRater;
  const canRemove =
    viewer !== null &&
    viewer.canRemove &&
    !isRater &&
    viewer.userId !== entry.ratedUserId &&
    (viewer.address === null || !isEqual(viewer.address, address));
  const { rater } = entry;
  const score = rater.score === null ? null : formatScore(rater.score);
  const columns = entryColumns[showRole ? "role" : "plain"];

  return (
    <>
      <article
        className={cn(
          "grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5 border-b border-border/60 px-4 pt-3 last:border-b-0 lg:min-h-13 lg:items-center lg:gap-x-4 lg:py-2.5",
          columns.grid,
        )}
      >
        <RatingIcon
          rating={entry.rating}
          className="col-start-1 row-start-1 size-5 max-lg:mt-px"
        />
        <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <FeedbackComment text={entry.comment} className="min-w-0 text-sm" />
          {!entry.scored && (
            <span
              title={m.feedback_entry_unscored_title()}
              className="rounded-sm border border-border px-1.5 py-0.5 text-xxs font-medium tracking-wider text-muted-foreground uppercase"
            >
              {m.feedback_entry_unscored()}
            </span>
          )}
        </div>
        <Timestamp
          date={entry.createdAt}
          relative="long"
          className={cn(
            "col-start-3 row-start-1 text-right text-xs whitespace-nowrap text-muted-foreground lg:text-sm",
            columns.time,
          )}
        />

        {/* a second line below lg, its own cells from it */}
        <div className="col-span-2 col-start-2 row-start-2 flex min-h-11 min-w-0 items-center gap-2 text-xs lg:contents lg:text-sm">
          <span className="flex min-w-0 items-baseline gap-1 lg:col-start-3 lg:row-start-1">
            <PartyLink party={rater} className="font-medium text-foreground" />
            {score !== null && (
              <span className="text-muted-foreground tabular-nums">
                {m.feedback_page_rater_score({
                  score: score.sign + score.digits,
                })}
              </span>
            )}
          </span>
          {showRole && (
            <ListingTypeBadge
              type={roleListingTypes[entry.role]}
              className={cn("lg:row-start-1", columns.role)}
            >
              {ratedRoleLabels[entry.role]()}
            </ListingTypeBadge>
          )}
          {entry.listingId !== null && (
            <Link
              to="/market/listing/$id"
              params={{ id: entry.listingId }}
              className={cn(
                "flex min-h-11 items-center font-medium whitespace-nowrap text-foreground hover:underline max-lg:ml-auto lg:row-start-1 lg:min-h-0",
                columns.listing,
              )}
            >
              {m.trade_page_view_listing()}
            </Link>
          )}
          {(canReport || canRemove) && (
            <div
              className={cn(
                "flex justify-end lg:row-start-1",
                entry.listingId === null && "max-lg:ml-auto",
                columns.menu,
              )}
            >
              <EntryMenu
                canReport={canReport}
                canRemove={canRemove}
                onReport={() => setReporting(true)}
                onRemove={() => setRemoving(true)}
              />
            </div>
          )}
        </div>
      </article>
      {canReport && (
        <ReportFeedbackDialog
          feedbackId={entry.id}
          name={partyName(entry.rater)}
          text={entry.comment}
          open={reporting}
          onOpenChange={setReporting}
        />
      )}
      {canRemove && (
        <RemoveFeedbackDialog
          feedbackId={entry.id}
          open={removing}
          ratedName={ownerName}
          onClose={() => setRemoving(false)}
          onSettled={() =>
            void queryClient.invalidateQueries({
              queryKey: feedbackKey(address),
            })
          }
        />
      )}
    </>
  );
}

function EntryMenu({
  canReport,
  canRemove,
  onReport,
  onRemove,
}: {
  canReport: boolean;
  canRemove: boolean;
  onReport: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.feedback_page_actions()}
            className="-my-0.5 shrink-0 text-muted-foreground"
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canReport && (
          <DropdownMenuItem onClick={onReport}>
            {m.feedback_report()}
          </DropdownMenuItem>
        )}
        {canRemove && (
          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            {m.admin_reports_remove_rating()}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The table's column names, from lg, where each rating is one line.
 */
export function FeedbackEntriesHeader({ showRole }: { showRole: boolean }) {
  const columns = entryColumns[showRole ? "role" : "plain"];
  return (
    <div
      aria-hidden
      className={cn(
        "hidden h-9 items-center gap-x-4 border-b border-border/60 px-4 text-xs font-medium tracking-wide text-muted-foreground lg:grid",
        columns.grid,
      )}
    >
      <span className="col-start-2">{m.feedback_page_column_comment()}</span>
      <span className="col-start-3">{m.feedback_page_column_from()}</span>
      {showRole && (
        <span className={columns.role}>{m.feedback_page_roles()}</span>
      )}
      <span className={columns.listing}>{m.feedback_page_column_trade()}</span>
      <span className={cn("text-right", columns.time)}>
        {m.feedback_page_column_when()}
      </span>
    </div>
  );
}
