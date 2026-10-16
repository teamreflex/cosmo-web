import { m } from "@/i18n/messages";
import { ratedRoleLabels } from "@/lib/client/feedback";
import { formatCount } from "@/lib/client/trade-listings";
import { feedbackEntriesQuery } from "@/lib/queries/feedback";
import {
  type FeedbackRoleFilter,
  feedbackRoleFilters,
  type FeedbackSearch,
} from "@/lib/universal/feedback";
import { type FeedbackRole, feedbackRoles } from "@apollo/database/web/types";
import { IconFilterOff } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { InfiniteQueryNext } from "../infinite-query-pending";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import FeedbackEntry, { type FeedbackViewer } from "./feedback-entry";

const route = getRouteApi("/@{$username}/feedback");

type Props = {
  address: string;
  /** the profile's name, who was rated */
  ownerName: string;
  search: FeedbackSearch;
  viewer: FeedbackViewer;
};

/**
 * The address's visible ratings in the picked role and rating, newest
 * first, twenty at a time.
 */
export default function FeedbackEntries({
  address,
  ownerName,
  search,
  viewer,
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
        {rows.map((entry) => (
          <FeedbackEntry
            key={entry.id}
            entry={entry}
            address={address}
            ownerName={ownerName}
            viewer={viewer}
          />
        ))}
      </div>
      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

/**
 * All, then each role the address was rated in, with their counts. Hidden
 * while every rating is in one role, as before sales every rating is a
 * trader's, unless a role is picked so the page can get back to all.
 * Scrolls sideways on phones.
 */
export function RoleTabs({
  value,
  roles,
  total,
}: {
  value: FeedbackRoleFilter;
  roles: Record<FeedbackRole, number>;
  total: number;
}) {
  const navigate = route.useNavigate();
  const rated = feedbackRoles.filter((role) => roles[role] > 0);
  if (rated.length < 2 && value === "all") return null;

  const counts = { all: total, ...roles };
  const tabs = feedbackRoleFilters.filter(
    (role) => role === "all" || role === value || roles[role] > 0,
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <Tabs
        value={value}
        onValueChange={(next) => {
          const picked = feedbackRoleFilters.find((role) => role === next);
          if (picked !== undefined) {
            void navigate({
              search: (prev) => ({ ...prev, role: picked }),
              replace: true,
              resetScroll: false,
            });
          }
        }}
      >
        <TabsList aria-label={m.feedback_page_roles()} className="max-md:h-10">
          {tabs.map((role) => (
            <TabsTrigger key={role} value={role}>
              {ratedRoleLabels[role]()}
              <span className="text-xs tabular-nums opacity-70">
                {formatCount(counts[role])}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
