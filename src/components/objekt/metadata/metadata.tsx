"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import Link from "next/link";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { LinkIcon, ImageDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { getObjektImageUrls } from "../common";
import { useUserState } from "@/hooks/use-user-state";
import { unobtainables } from "@/lib/unobtainables";
import { env } from "@/env";
import Portal from "../../portal";
import Pill from "./pill";
import EditMetadata from "./edit-metadata";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektMetadata } from "@/lib/universal/objekts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SerialsPanel from "./serials-panel";
import { useObjektSerial } from "@/hooks/use-objekt-serial";

type Props = {
  objekt: Objekt.Collection;
};

export default function Metadata({ objekt }: Props) {
  const [_, copy] = useCopyToClipboard();
  const [showForm, setShowForm] = useState(false);
  const { user } = useUserState();
  const { serial, setSerial } = useObjektSerial();

  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", "metadata", objekt.slug],
    queryFn: () =>
      ofetch<ObjektMetadata>(`/api/objekts/metadata/${objekt.slug}`),
    retry: 1,
  });

  function copyUrl() {
    const scheme =
      env.NEXT_PUBLIC_VERCEL_ENV === "development" ? "http" : "https";
    copy(
      `${scheme}://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/objekts?id=${objekt.slug}`
    );
    toast.success("Objekt URL copied to clipboard");
  }

  const { front } = getObjektImageUrls(objekt);
  const isUnobtainable = unobtainables.includes(objekt.slug);
  const total = Number(data.total).toLocaleString();

  return (
    <div className="flex grow flex-col justify-between gap-2 px-4">
      <Tabs
        defaultValue={serial ? "serials" : "metadata"}
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
              slug={objekt.slug}
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
              <Link href={front.download} target="_blank">
                <ImageDown />
              </Link>
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
                  href={`/@${data.metadata.profile.username}`}
                  prefetch={false}
                >
                  {data.metadata.profile.username}
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        {/* serials */}
        <TabsContent value="serials" className="flex grow">
          <SerialsPanel
            slug={objekt.slug}
            serial={serial}
            setSerial={setSerial}
          />
        </TabsContent>
      </Tabs>

      <Portal to="#attribute-panel">
        <Pill
          label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
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
