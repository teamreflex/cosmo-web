import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { ImageDown, LinkIcon } from "lucide-react";
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
    queryFn: () =>
      ofetch<ObjektMetadata>(`/api/objekts/metadata/${props.objekt.slug}`),
    retry: 1,
  });

  function copyUrl() {
    const scheme = env.VITE_VERCEL_ENV === "development" ? "http" : "https";
    copy(
      `${scheme}://${env.VITE_VERCEL_PROJECT_PRODUCTION_URL}/objekts?id=${props.objekt.slug}`
    );
    toast.success("Objekt URL copied to clipboard");
  }

  const { front } = getObjektImageUrls(props.objekt);
  const isUnobtainable = unobtainables.includes(props.objekt.slug);
  const total = Number(data.total).toLocaleString();

  return (
    <div className="flex grow flex-col justify-between gap-2 px-4">
      <Tabs
        value={props.tab}
        onValueChange={(value) => props.setTab(value as ObjektMetadataTab)}
        className="flex flex-col h-full"
        variant="underline"
      >
        <TabsList className="w-fit mx-auto md:mx-0">
          <TabsTrigger value="metadata">Information</TabsTrigger>
          <TabsTrigger value="serials">Serials</TabsTrigger>
        </TabsList>

        {/* metadata */}
        <TabsContent value="metadata" className="flex flex-col grow">
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

          <div className="flex flex-row-reverse gap-2 items-center self-end mt-auto w-full">
            <Button variant="secondary" size="sm" onClick={copyUrl}>
              <LinkIcon />
            </Button>

            <Button variant="secondary" size="sm" asChild>
              <a href={front.download} target="_blank">
                <ImageDown />
              </a>
            </Button>

            {user?.isAdmin === true && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? "Cancel" : "Edit Metadata"}
              </Button>
            )}

            {!!data.metadata?.profile && (
              <div className="flex items-center gap-1 text-xs mr-auto">
                <p>Sourced by:</p>
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
            props.objekt.onOffline === "online" ? "Copies" : "Scanned Copies"
          }
          value={total}
        />
        <Pill label="Tradable" value={`${data.percentage}%`} />
        {isUnobtainable && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-xs sm:text-sm bg-red-500">
            <span className="font-semibold text-white">Unobtainable</span>
          </div>
        )}
      </Portal>
    </div>
  );
}
