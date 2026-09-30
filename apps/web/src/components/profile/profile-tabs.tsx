import BinderShelf from "@/components/binders/binder-shelf";
import ListShelf from "@/components/lists/list-shelf";
import { m } from "@/i18n/messages";
import { binderShelfQuery } from "@/lib/queries/binders";
import { listShelfQuery } from "@/lib/queries/lists";
import { cn } from "@/lib/utils";
import {
  IconCalendarStats,
  IconChartPie,
  IconChevronDown,
  IconList,
  IconNotebook,
  IconPackage,
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
import ProfileToolbar from "./profile-toolbar";

const route = getRouteApi("/@{$username}");

/**
 * Shared by route links and shelf buttons. Links get `data-status=active`
 * from the router, shelf buttons set `data-state=open` while their shelf is.
 * Tighter between md and lg, where the page toolbar shares the row.
 */
const tabClassName =
  "-mb-px flex flex-1 items-center justify-center gap-1 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-cosmo/50 focus-visible:ring-inset data-[state=open]:text-foreground data-[status=active]:border-cosmo data-[status=active]:text-foreground md:flex-none md:px-2 lg:px-3";

type Shelf = "binders" | "lists";

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
  // lowercase like the stored slugs, since urls match them case-insensitively
  const binderSlug = useMatch({
    from: "/@{$username}/binder/$slug",
    shouldThrow: false,
    select: (match) => match.params.slug.toLowerCase(),
  });
  const listSlug = useMatch({
    from: "/@{$username}/list/$slug",
    shouldThrow: false,
    select: (match) => match.params.slug.toLowerCase(),
  });

  const [openShelf, setOpenShelf] = useState<Shelf>();
  // navigating anywhere closes the shelf, including through links inside it
  const [shelfPathname, setShelfPathname] = useState(pathname);
  if (pathname !== shelfPathname) {
    setShelfPathname(pathname);
    setOpenShelf(undefined);
  }

  function toggleShelf(shelf: Shelf) {
    setOpenShelf(openShelf === shelf ? undefined : shelf);
  }

  function prefetchBinders() {
    if (target.user) {
      void queryClient.prefetchQuery(binderShelfQuery(target.user.id));
    }
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
      setOpenShelf(undefined);
    }
  }

  /**
   * One grid places each piece per breakpoint without rendering anything
   * twice: on mobile the page toolbar gets its own row under the shelves, and
   * from md it overlays the free end of the tab row.
   */
  return (
    <div className="grid grid-cols-1" onKeyDown={handleKeyDown}>
      <nav
        aria-label={m.profile_tabs()}
        className="col-start-1 row-start-1 container flex md:h-12 lg:gap-2"
      >
        <Link
          to="/@{$username}"
          params={{ username }}
          activeOptions={{ exact: true, includeSearch: false }}
          className={tabClassName}
        >
          <IconPackage className="size-5 md:hidden" />
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
          aria-expanded={openShelf === "binders"}
          aria-controls="profile-shelf-binders"
          data-state={openShelf === "binders" ? "open" : "closed"}
          data-status={binderSlug !== undefined ? "active" : undefined}
          onClick={() => toggleShelf("binders")}
          onPointerEnter={prefetchBinders}
          onFocus={prefetchBinders}
          className={tabClassName}
        >
          <IconNotebook className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{m.binder_binders()}</span>
          <IconChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" />
        </button>
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

      <ShelfPanel
        id="profile-shelf-binders"
        open={openShelf === "binders"}
        className="col-start-1 row-start-2"
      >
        <BinderShelf
          username={username}
          displayName={target.cosmo.username}
          userId={target.user?.id}
          isOwner={isAuthenticated}
          activeSlug={binderSlug}
        />
      </ShelfPanel>
      <ShelfPanel
        id="profile-shelf-lists"
        open={openShelf === "lists"}
        className="col-start-1 row-start-3"
      >
        <ListShelf
          username={username}
          displayName={target.cosmo.username}
          userId={target.user?.id}
          isOwner={isAuthenticated}
          activeSlug={listSlug}
        />
      </ShelfPanel>

      {/* hidden on routes without a toolbar, so they don't get an empty mobile bar */}
      <div className="col-start-1 row-start-4 border-t border-border has-[>div:empty]:hidden md:pointer-events-none md:row-start-1 md:border-t-0">
        <div className="container flex h-14 items-center gap-2 md:h-full md:justify-end">
          <ProfileToolbar address={target.cosmo.address} />
        </div>
      </div>
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
  className,
  children,
}: {
  id: string;
  open: boolean;
  className: string;
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
      className={cn(
        "grid grid-rows-[0fr] border-t border-transparent transition-[grid-template-rows,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[open=true]:grid-rows-[1fr] data-[open=true]:border-border motion-reduce:transition-none",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{hasOpened && children}</div>
    </div>
  );
}
