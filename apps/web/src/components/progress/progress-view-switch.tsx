import type { GridFilters } from "@/hooks/use-grid-filters";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconChartPie, IconLayoutGrid } from "@tabler/icons-react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";

const route = getRouteApi("/@{$username}");

const segmentClassName = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "text-muted-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground",
);

type Props = {
  view: "progress" | "grid";
  search: Pick<GridFilters, "artist" | "member">;
};

/**
 * Links between the progress overview and the grid, carrying the member
 * selection across. Both stay under the Progress tab.
 */
export default function ProgressViewSwitch({ view, search }: Props) {
  // the raw param keeps active matching working for address and mixed-case urls
  const { username } = route.useParams();

  return (
    <>
      <ButtonGroup aria-label={m.progress_title()} className="max-md:hidden">
        <Link
          to="/@{$username}/progress"
          params={{ username }}
          search={search}
          activeOptions={{ includeSearch: false }}
          className={segmentClassName}
        >
          <IconChartPie />
          <span className="sr-only lg:not-sr-only">
            {m.progress_overview()}
          </span>
        </Link>
        <Link
          to="/@{$username}/grid"
          params={{ username }}
          search={search}
          activeOptions={{ includeSearch: false }}
          className={segmentClassName}
        >
          <IconLayoutGrid />
          <span className="sr-only lg:not-sr-only">{m.grid_title()}</span>
        </Link>
      </ButtonGroup>

      {/* the mobile page bar already names the view, and the Progress tab leads back from the grid */}
      {view === "progress" && (
        <Link
          to="/@{$username}/grid"
          params={{ username }}
          search={search}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "md:hidden",
          )}
        >
          <IconLayoutGrid />
          <span className="sr-only sm:not-sr-only">{m.grid_title()}</span>
        </Link>
      )}
    </>
  );
}
