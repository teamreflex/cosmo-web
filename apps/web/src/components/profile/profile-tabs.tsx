import ListDropdown from "@/components/lists/list-dropdown";
import { m } from "@/i18n/messages";
import type { ObjektList } from "@apollo/database/web/types";
import {
  IconCalendarStats,
  IconChartPie,
  IconChevronDown,
  IconLayoutGrid,
  IconList,
  IconSend,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi, useMatch } from "@tanstack/react-router";

const route = getRouteApi("/@{$username}");

/**
 * Shared by route links and shelf buttons. Links get `data-status=active`
 * from the router, shelf buttons get `data-state=open` from Radix.
 */
const tabClassName =
  "-mb-px flex flex-1 items-center justify-center gap-1 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground data-[state=open]:text-foreground data-[status=active]:border-cosmo data-[status=active]:text-foreground md:flex-none";

type Props = {
  isAuthenticated: boolean;
};

export default function ProfileTabs({ isAuthenticated }: Props) {
  // the raw param keeps active matching working for address and mixed-case urls
  const { username } = route.useParams();
  // grid is reached from the progress page, so it keeps Progress highlighted
  const onGrid =
    useMatch({ from: "/@{$username}/grid", shouldThrow: false }) !== undefined;

  return (
    <div className="border-b border-border bg-muted/40">
      <nav aria-label={m.profile_tabs()} className="container flex md:gap-2">
        <Link
          to="/@{$username}"
          params={{ username }}
          activeOptions={{ exact: true, includeSearch: false }}
          className={tabClassName}
        >
          <IconLayoutGrid className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.collection_title()}</span>
        </Link>
        <Link
          to="/@{$username}/trades"
          params={{ username }}
          activeOptions={{ includeSearch: false }}
          className={tabClassName}
        >
          <IconSend className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.trades_title()}</span>
        </Link>
        <Link
          to="/@{$username}/como"
          params={{ username }}
          activeOptions={{ includeSearch: false }}
          className={tabClassName}
        >
          <IconCalendarStats className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.common_como()}</span>
        </Link>
        <Link
          to="/@{$username}/progress"
          params={{ username }}
          activeOptions={{ includeSearch: false }}
          inactiveProps={
            onGrid ? { "data-status": "active", "aria-current": "page" } : {}
          }
          className={tabClassName}
        >
          <IconChartPie className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.progress_title()}</span>
        </Link>
        <ListsTab isAuthenticated={isAuthenticated} />
      </nav>
    </div>
  );
}

function ListsTab({ isAuthenticated }: Props) {
  const { targetAccountOptions } = route.useRouteContext();
  const { data } = useSuspenseQuery(targetAccountOptions);

  return (
    <ListDropdown
      objektLists={data.objektLists}
      allowCreate={isAuthenticated}
      createListUrl={(list: ObjektList) =>
        `/@${data.cosmo.username}/list/${list.slug}`
      }
      trigger={
        <button type="button" className={tabClassName}>
          <IconList className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.list_lists()}</span>
          <IconChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" />
        </button>
      }
    />
  );
}
