import { m } from "@/i18n/messages";
import { formatScore, ratedRoleLabels } from "@/lib/client/feedback";
import { partyName } from "@/lib/client/trade-listings";
import { feedbackKey } from "@/lib/queries/feedback";
import type { FeedbackProfileEntry } from "@/lib/universal/feedback";
import { isEqual } from "@apollo/util";
import { IconDots } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import ReportFeedbackDialog from "../reports/report-feedback-dialog";
import { PartyLink } from "../trades/trade-header";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Timestamp } from "../ui/timestamp";
import FeedbackBody from "./feedback-body";
import { FeedbackComment } from "./feedback-text";
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
};

/**
 * One rating on the feedback page: its sign, any comment, who left it with
 * their own score, the role the profile was rated in, whether it counts,
 * its listing and when it was left. Its menu holds what the viewer may do
 * with it.
 */
export default function FeedbackEntry({
  entry,
  address,
  ownerName,
  viewer,
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

  return (
    <>
      <FeedbackBody
        entry={entry}
        className="border-b border-border/60 px-4 py-3.5 last:border-b-0 md:gap-3.5"
      >
        <div className="flex items-start gap-2">
          <FeedbackComment
            text={entry.comment}
            className="min-w-0 flex-1 text-sm leading-relaxed"
          />
          {(canReport || canRemove) && (
            <EntryMenu
              canReport={canReport}
              canRemove={canRemove}
              onReport={() => setReporting(true)}
              onRemove={() => setRemoving(true)}
            />
          )}
        </div>

        <EntryMeta entry={entry} />
      </FeedbackBody>
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
 * Who rated, with their own score, the role the profile was rated in, a tag
 * when the rating doesn't count towards the score, a link to the listing the
 * trade came from and when the rating was left.
 */
function EntryMeta({ entry }: { entry: FeedbackProfileEntry }) {
  const { rater } = entry;
  const score = rater.score === null ? null : formatScore(rater.score);
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      <span>
        <PartyLink party={rater} className="font-medium text-foreground" />
        {score !== null && (
          <span className="tabular-nums">
            {" "}
            {m.feedback_page_rater_score({
              score: score.sign + score.digits,
            })}
          </span>
        )}
      </span>
      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xxs font-medium tracking-wider uppercase">
        {ratedRoleLabels[entry.role]()}
      </span>
      {!entry.scored && (
        <span
          title={m.feedback_entry_unscored_title()}
          className="rounded-sm border border-border px-1.5 py-0.5 text-xxs font-medium tracking-wider uppercase"
        >
          {m.feedback_entry_unscored()}
        </span>
      )}
      {entry.listingId !== null && (
        <Link
          to="/market/listing/$id"
          params={{ id: entry.listingId }}
          preload={false}
          className="font-medium text-foreground hover:underline"
        >
          {m.trade_page_view_listing()}
        </Link>
      )}
      <Timestamp
        date={entry.createdAt}
        relative="long"
        className="md:ml-auto"
      />
    </div>
  );
}
