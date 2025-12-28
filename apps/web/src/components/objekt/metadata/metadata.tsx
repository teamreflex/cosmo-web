import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useCopyToClipboard } from "usehooks-ts";
import {
  IconCloudDownload,
  IconLink,
  IconMovie,
  IconPhoto,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "../../ui/button";
import { getObjektImageUrls } from "../common";
import Portal from "../../portal";
import Pill from "./pill";
import SerialsPanel from "./serials-panel";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  CollectionDataEvent,
  ObjektMetadata,
} from "@/lib/universal/objekts";
import type { ObjektMetadataTab } from "./common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env/client";
import { unobtainables } from "@/lib/unobtainables";
import { m } from "@/i18n/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  objekt: Objekt.Collection;
  tab: ObjektMetadataTab;
  setTab: (tab: ObjektMetadataTab) => void;
};

export default function Metadata(props: Props) {
  const [_, copy] = useCopyToClipboard();
  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", "metadata", props.objekt.slug],
    queryFn: ({ signal }) =>
      ofetch<ObjektMetadata>(`/api/objekts/metadata/${props.objekt.slug}`, {
        signal,
      }),
    retry: 1,
  });

  function copyUrl() {
    const scheme = env.VITE_APP_ENV === "development" ? "http" : "https";
    copy(`${scheme}://${env.VITE_BASE_URL}/objekts?id=${props.objekt.slug}`);
    toast.success(m.toast_objekt_url_copied());
  }

  const { front, back } = getObjektImageUrls(props.objekt);
  const isUnobtainable = unobtainables.includes(props.objekt.slug);
  const total = Number(data.total).toLocaleString();

  return (
    <div className="flex grow flex-col justify-between gap-2 px-4">
      <Tabs
        value={props.tab}
        onValueChange={(value) => props.setTab(value as ObjektMetadataTab)}
        className="flex h-full flex-col"
      >
        <TabsList variant="line" className="mx-auto w-fit md:mx-0">
          <TabsTrigger value="metadata">
            {m.objekt_metadata_information()}
          </TabsTrigger>
          <TabsTrigger value="serials">
            {m.objekt_metadata_serials()}
          </TabsTrigger>
        </TabsList>

        {/* metadata */}
        <TabsContent value="metadata" className="flex grow flex-col">
          {data.data?.description && (
            <p className="min-h-10 text-sm sm:text-base">
              {data.data.description}
            </p>
          )}

          <div className="mt-auto flex w-full flex-row-reverse items-center gap-2 self-end">
            <Button variant="secondary" size="sm" onClick={copyUrl}>
              <IconLink />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="focus:outline-none"
                >
                  <IconCloudDownload />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-fit">
                <DropdownMenuItem asChild>
                  <a href={front.download} target="_blank">
                    <IconPhoto />
                    <span>{m.objekt_metadata_save_front_image()}</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={back.download} target="_blank">
                    <IconPhoto />
                    <span>{m.objekt_metadata_save_back_image()}</span>
                  </a>
                </DropdownMenuItem>
                {props.objekt.frontMedia && (
                  <DropdownMenuItem asChild>
                    <a href={props.objekt.frontMedia} target="_blank">
                      <IconMovie />
                      <span>{m.objekt_metadata_save_video()}</span>
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {data.data?.event && (
              <div className="mr-auto flex min-h-10 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {m.event_from()}
                </span>
                <EventBadge event={data.data.event} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* serials */}
        <TabsContent value="serials" className="flex grow">
          <SerialsPanel slug={props.objekt.slug} />
        </TabsContent>
      </Tabs>

      <Portal to="#attribute-panel">
        <Pill
          label={
            props.objekt.onOffline === "online"
              ? m.objekt_metadata_copies()
              : m.objekt_metadata_scanned_copies()
          }
          value={total}
        />
        <Pill
          label={m.objekt_metadata_tradable()}
          value={`${data.percentage}%`}
        />
        {isUnobtainable && (
          <div className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs sm:text-sm">
            <span className="font-semibold text-white">
              {m.objekt_metadata_unobtainable()}
            </span>
          </div>
        )}
      </Portal>
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
