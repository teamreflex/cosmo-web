import ListShelf from "@/components/lists/list-shelf";
import { m } from "@/i18n/messages";
import { listShelfQuery } from "@/lib/queries/lists";
import {
  IconCalendarStats,
  IconChartPie,
  IconChevronDown,
  IconLayoutGrid,
  IconList,
  IconSend,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Link,
  getRouteApi,
  useLocation,
  useMatch,
} from "@tanstack/react-router";
import { type KeyboardEvent, type ReactNode, useState } from "react";

const route = getRouteApi("/@{$username}");

/**
 * Shared by route links and shelf buttons. Links get `data-status=active`
 * from the router, shelf buttons set `data-state=open` while their shelf is.
 */
const tabClassName =
  "-mb-px flex flex-1 items-center justify-center gap-1 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground data-[state=open]:text-foreground data-[status=active]:border-cosmo data-[status=active]:text-foreground md:flex-none";

type Shelf = "lists";

type Props = {
  isAuthenticated: boolean;
};

export default function ProfileTabs({ isAuthenticated }: Props) {
  // the raw param keeps active matching working for address and mixed-case urls
  const { username } = route.useParams();
  const { targetAccountOptions } = route.useRouteContext();
  const { data: target } = useSuspenseQuery(targetAccountOptions);
  const queryClient = useQueryClient();
  const pathname = useLocation({ select: (location) => location.pathname });
  // grid is reached from the progress page, so it keeps Progress highlighted
  const onGrid =
    useMatch({ from: "/@{$username}/grid", shouldThrow: false }) !== undefined;
  const listSlug = useMatch({
    from: "/@{$username}/list/$slug",
    shouldThrow: false,
    select: (match) => match.params.slug,
  });

  // remembering where a shelf opened closes it on navigation, including links inside it
  const [opened, setOpened] = useState<{ shelf: Shelf; pathname: string }>();
  const openShelf = opened?.pathname === pathname ? opened.shelf : undefined;

  function toggleShelf(shelf: Shelf) {
    setOpened(openShelf === shelf ? undefined : { shelf, pathname });
  }

  function prefetchLists() {
    if (target.user) {
      void queryClient.prefetchQuery(listShelfQuery(target.user.id));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // dialogs opened from a shelf are portaled out of this element, and handle their own escape
    if (
      event.key === "Escape" &&
      openShelf !== undefined &&
      event.target instanceof Node &&
      event.currentTarget.contains(event.target)
    ) {
      setOpened(undefined);
    }
  }

  return (
    <div
      className="border-b border-border bg-muted/40"
      onKeyDown={handleKeyDown}
    >
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
        <button
          type="button"
          aria-expanded={openShelf === "lists"}
          aria-controls="profile-shelf-lists"
          data-state={openShelf === "lists" ? "open" : "closed"}
          data-status={listSlug !== undefined ? "active" : undefined}
          onClick={() => toggleShelf("lists")}
          onPointerEnter={prefetchLists}
          onFocus={prefetchLists}
          className={tabClassName}
        >
          <IconList className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.list_lists()}</span>
          <IconChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" />
        </button>
      </nav>

      <ShelfPanel id="profile-shelf-lists" open={openShelf === "lists"}>
        <ListShelf
          username={username}
          displayName={target.cosmo.username}
          userId={target.user?.id}
          isOwner={isAuthenticated}
          activeSlug={listSlug}
        />
      </ShelfPanel>
    </div>
  );
}

/**
 * Accordion that pushes the page down. Content mounts on first open and
 * stays mounted afterwards, so closing can animate.
 */
function ShelfPanel({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) {
    setHasOpened(true);
  }

  return (
    <div
      id={id}
      data-open={open}
      inert={!open}
      className="grid grid-rows-[0fr] border-t border-transparent transition-[grid-template-rows,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[open=true]:grid-rows-[1fr] data-[open=true]:border-border motion-reduce:transition-none"
    >
      <div className="min-h-0 overflow-hidden">{hasOpened && children}</div>
    </div>
  );
}
