import type { GridFilters } from "@/hooks/use-grid-filters";
import { m } from "@/i18n/messages";
import { IconChartPie, IconLayoutGrid } from "@tabler/icons-react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";

const route = getRouteApi("/@{$username}");

const segmentClassName =
  "text-muted-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground";

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
        <Button
          variant="outline"
          size="sm"
          className={segmentClassName}
          asChild
        >
          <Link
            to="/@{$username}/progress"
            params={{ username }}
            search={search}
            activeOptions={{ includeSearch: false }}
          >
            <IconChartPie />
            <span className="sr-only lg:not-sr-only">
              {m.progress_overview()}
            </span>
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={segmentClassName}
          asChild
        >
          <Link
            to="/@{$username}/grid"
            params={{ username }}
            search={search}
            activeOptions={{ includeSearch: false }}
          >
            <IconLayoutGrid />
            <span className="sr-only lg:not-sr-only">{m.grid_title()}</span>
          </Link>
        </Button>
      </ButtonGroup>

      {/* the mobile page bar already names the view, and the Progress tab leads back from the grid */}
      {view === "progress" && (
        <Button variant="outline" size="sm" className="md:hidden" asChild>
          <Link to="/@{$username}/grid" params={{ username }} search={search}>
            <IconLayoutGrid />
            <span className="sr-only sm:not-sr-only">{m.grid_title()}</span>
          </Link>
        </Button>
      )}
    </>
  );
}
