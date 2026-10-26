import { m } from "@/i18n/messages";
import { ratingStyles } from "@/lib/client/feedback";
import { feedbackSummaryQuery } from "@/lib/queries/feedback";
import {
  type FeedbackRatingFilter as RatingFilter,
  feedbackRatingFilters,
} from "@/lib/universal/feedback";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

const route = getRouteApi("/@{$username}/feedback");

const label = (value: RatingFilter) =>
  value === "all" ? m.feedback_page_rating_all() : ratingStyles[value].label();

/**
 * Narrows the feedback page to one rating, once the address has a rating
 * to narrow.
 */
export default function FeedbackRatingFilter({ address }: { address: string }) {
  const value = route.useSearch({ select: (search) => search.rating });
  const navigate = route.useNavigate();
  const { data: rated } = useSuspenseQuery({
    ...feedbackSummaryQuery(address),
    select: ({ total }) => total > 0,
  });
  if (!rated) return null;
  const options: SingleSelectOption<RatingFilter>[] = feedbackRatingFilters.map(
    (option) => ({ value: option, label: label(option) }),
  );

  return (
    <FilterChip
      label={m.feedback_page_rating()}
      valueLabel={
        value === "all" ? m.filter_value_all() : label(value).toLowerCase()
      }
      active={value !== "all"}
      width={180}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={value}
          onChange={(rating) =>
            void navigate({
              search: (prev) => ({ ...prev, rating }),
              replace: true,
              resetScroll: false,
            })
          }
          close={close}
        />
      )}
    </FilterChip>
  );
}
