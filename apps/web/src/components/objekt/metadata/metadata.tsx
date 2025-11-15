import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { CloudDownload, Film, ImageIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "../../ui/button";
import { getObjektImageUrls } from "../common";
import Portal from "../../portal";
import Pill from "./pill";
import EditMetadata from "./edit-metadata";
import SerialsPanel from "./serials-panel";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektMetadata } from "@/lib/universal/objekts";
import type { ObjektMetadataTab } from "./common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/lib/env/client";
import { unobtainables } from "@/lib/unobtainables";
import { useUserState } from "@/hooks/use-user-state";
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
  const [showForm, setShowForm] = useState(false);
  const { user } = useUserState();

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
        variant="underline"
      >
        <TabsList className="mx-auto w-fit md:mx-0">
          <TabsTrigger value="metadata">
            {m.objekt_metadata_information()}
          </TabsTrigger>
          <TabsTrigger value="serials">
            {m.objekt_metadata_serials()}
          </TabsTrigger>
        </TabsList>

        {/* metadata */}
        <TabsContent value="metadata" className="flex grow flex-col">
          {showForm ? (
            <EditMetadata
              slug={props.objekt.slug}
              metadata={data}
              onClose={() => setShowForm(false)}
            />
          ) : (
            data.metadata !== undefined && (
              <div className="min-h-10 sm:h-full">
                <p className="text-sm sm:text-base">
                  {data.metadata.description}
                </p>
              </div>
            )
          )}

          <div className="mt-auto flex w-full flex-row-reverse items-center gap-2 self-end">
            <Button variant="secondary" size="sm" onClick={copyUrl}>
              <LinkIcon />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="focus:outline-none"
                >
                  <CloudDownload />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end">
                <DropdownMenuItem asChild>
                  <a href={front.download} target="_blank">
                    <ImageIcon />
                    <span>{m.objekt_metadata_save_front_image()}</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={back.download} target="_blank">
                    <ImageIcon />
                    <span>{m.objekt_metadata_save_back_image()}</span>
                  </a>
                </DropdownMenuItem>
                {props.objekt.frontMedia && (
                  <DropdownMenuItem asChild>
                    <a href={props.objekt.frontMedia} target="_blank">
                      <Film />
                      <span>{m.objekt_metadata_save_video()}</span>
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {user?.isAdmin === true && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? m.common_cancel() : m.objekt_metadata_edit()}
              </Button>
            )}

            {!!data.metadata?.profile && (
              <div className="mr-auto flex items-center gap-1 text-xs">
                <p>{m.objekt_metadata_sourced_by()}</p>
                <Link
                  className="underline"
                  to="/@{$username}"
                  params={{ username: data.metadata.profile.username }}
                >
                  {data.metadata.profile.username}
                </Link>
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
