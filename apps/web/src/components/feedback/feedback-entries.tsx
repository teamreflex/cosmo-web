import { m } from "@/i18n/messages";
import { feedbackEntriesQuery } from "@/lib/queries/feedback";
import type { FeedbackSearch } from "@/lib/universal/feedback";
import { IconFilterOff } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { InfiniteQueryNext } from "../infinite-query-pending";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import FeedbackEntry, {
  FeedbackEntriesHeader,
  type FeedbackViewer,
} from "./feedback-entry";

type Props = {
  address: string;
  /** the profile's name, who was rated */
  ownerName: string;
  search: FeedbackSearch;
  viewer: FeedbackViewer;
  /** whether the address was rated in more than one role */
  showRole: boolean;
};

/**
 * The address's visible ratings in the picked role and rating, newest
 * first, loading twenty more as the list's end scrolls into view.
 */
export default function FeedbackEntries({
  address,
  ownerName,
  search,
  viewer,
  showRole,
}: Props) {
  const query = useSuspenseInfiniteQuery(feedbackEntriesQuery(address, search));
  const rows = query.data.pages.flatMap((page) => page.rows);

  return rows.length === 0 ? (
    <Empty className="rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFilterOff />
        </EmptyMedia>
        <EmptyTitle className="text-base">
          {m.feedback_page_no_match()}
        </EmptyTitle>
        <EmptyDescription>{m.feedback_page_no_match_body()}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <>
      <div className="overflow-clip rounded-lg border border-border bg-card">
        <FeedbackEntriesHeader showRole={showRole} />
        {rows.map((entry) => (
          <FeedbackEntry
            key={entry.id}
            entry={entry}
            address={address}
            ownerName={ownerName}
            viewer={viewer}
            showRole={showRole}
          />
        ))}
      </div>
      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isFetchNextPageError={query.isFetchNextPageError}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}
