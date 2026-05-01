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
import { unobtainables } from "@/lib/unobtainables";
import { cn } from "@/lib/utils";
import {
  IconAlertSquareRounded,
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
  const missingVideo =
    props.objekt.class === "Motion" && !props.objekt.frontMedia;
  const missingAudio = props.objekt.hasAudio && !props.objekt.frontMedia;
  const isUnobtainable = unobtainables.includes(props.objekt.slug);

  return (
    <div className="shrink-0 border-t border-border bg-card">
      {missingVideo && (
        <NoticeRow
          text={m.objekt_metadata_video_not_loaded()}
          className="text-orange-500"
        />
      )}
      {missingAudio && (
        <NoticeRow
          text={m.objekt_metadata_audio_not_loaded()}
          className="text-orange-500"
        />
      )}
      {isUnobtainable && (
        <NoticeRow
          text={m.objekt_metadata_unobtainable()}
          className="text-red-500"
        />
      )}
      <Suspense fallback={<FooterFallback />}>
        <FooterInner objekt={props.objekt} />
      </Suspense>
    </div>
  );
}

function NoticeRow({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 focus:outline-none border-b border-border px-4 py-2 text-xs w-full",
        className,
      )}
    >
      <IconAlertSquareRounded className="size-4" />
      <span>{text}</span>
    </div>
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
  const event = data.data?.event ?? null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {event !== null && <EventBadge event={event} />}

      <div className="ml-auto flex shrink-0 items-center gap-1">
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
    <div className="flex items-center gap-2 px-4 py-2">
      {/* event */}
      <div className="flex items-center gap-1">
        <Skeleton className="aspect-square size-5 rounded" />
        <Skeleton className="h-5 w-40 rounded-4xl" />
      </div>

      {/* buttons */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Skeleton className="size-8 rounded-sm" />
        <Skeleton className="size-8 rounded-sm" />
      </div>
    </div>
  );
}

function EventBadge({ event }: { event: CollectionDataEvent }) {
  const imageUrl = event.era.spotifyAlbumArt || event.era.imageUrl;

  return (
    <div className="flex min-w-0 items-center gap-1">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={event.era.name}
          className="aspect-square size-5 shrink-0 rounded"
        />
      )}
      <Badge variant="secondary" className="min-w-0 shrink gap-1">
        <Link
          to={`/events/$slug`}
          params={{ slug: event.slug }}
          className="min-w-0 truncate"
        >
          {event.name}
        </Link>
      </Badge>
    </div>
  );
}
