import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { getObjektImageUrls } from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import { objektMetadataQuery } from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { CollectionDataEvent } from "@/lib/universal/objekts";
import {
  IconCloudDownload,
  IconLink,
  IconMovie,
  IconPhoto,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import EditMetadata from "./edit-metadata";

type Props = {
  objekt: Objekt.Collection;
};

export default function MetadataFooter(props: Props) {
  return (
    <Suspense fallback={<FooterFallback />}>
      <FooterInner objekt={props.objekt} />
    </Suspense>
  );
}

function FooterInner(props: Props) {
  const { user } = useUserState();
  const [_, copy] = useCopyToClipboard();
  const { data } = useSuspenseQuery(objektMetadataQuery(props.objekt.slug));

  function copyUrl() {
    const scheme = env.VITE_APP_ENV === "development" ? "http" : "https";
    void copy(`${scheme}://${env.VITE_BASE_URL}?id=${props.objekt.slug}`);
    toast.success(m.toast_objekt_url_copied());
  }

  const { front, back } = getObjektImageUrls(props.objekt);

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-2">
      {data.data?.event ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
            {m.event_from()}
          </span>
          <EventBadge event={data.data.event} />
        </div>
      ) : (
        <div />
      )}
      <div className="ml-auto flex items-center gap-1">
        {user?.isAdmin && (
          <EditMetadata
            slug={props.objekt.slug}
            defaultValue={data.data?.description}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={m.aria_download()}
            >
              <IconCloudDownload />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-fit">
            <DropdownMenuItem asChild>
              <a
                href={front.download}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconPhoto />
                <span>{m.objekt_metadata_save_front_image()}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={back.download} target="_blank" rel="noopener noreferrer">
                <IconPhoto />
                <span>{m.objekt_metadata_save_back_image()}</span>
              </a>
            </DropdownMenuItem>
            {props.objekt.frontMedia && (
              <DropdownMenuItem asChild>
                <a
                  href={props.objekt.frontMedia}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconMovie />
                  <span>{m.objekt_metadata_save_video()}</span>
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={copyUrl}
          aria-label={m.aria_copy_url()}
        >
          <IconLink />
        </Button>
      </div>
    </div>
  );
}

function FooterFallback() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-2">
      <Skeleton className="h-6 w-32" />
      <div className="ml-auto flex items-center gap-1">
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
      </div>
    </div>
  );
}

function EventBadge({ event }: { event: CollectionDataEvent }) {
  const imageUrl = event.era.spotifyAlbumArt || event.era.imageUrl;

  return (
    <div className="flex items-center gap-1">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={event.era.name}
          className="aspect-square size-5 rounded"
        />
      )}
      <Badge variant="secondary" className="gap-1">
        <Link to={`/events/$slug`} params={{ slug: event.slug }}>
          {event.name}
        </Link>
      </Badge>
    </div>
  );
}
