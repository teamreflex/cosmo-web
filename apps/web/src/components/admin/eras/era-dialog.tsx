import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { uploadToPresignedUrl } from "@/lib/client/upload";
import {
  $createEra,
  $getEraImageUploadUrl,
  $updateEra,
} from "@/lib/functions/events";
import { adminErasQuery } from "@/lib/queries/events";
import type { SpotifyAlbum } from "@/lib/universal/events";
import type { CreateEraInput } from "@/lib/universal/schema/events";
import { createEraSchema } from "@/lib/universal/schema/events";
import type { Era } from "@apollo/database/web/types";
import { slugify } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import DeleteEra from "./delete-era";
import EraForm from "./era-form";

const route = getRouteApi("/admin/eras");

/**
 * With an era, the dialog edits it and opens from `children`. Without one it
 * creates an era and opens from its own button.
 */
type Props =
  | { era: Era; children: React.ReactElement }
  | { era?: undefined; children?: undefined };

export default function EraDialog({ era, children }: Props) {
  const { artists } = route.useLoaderData();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const selectedImageRef = useRef<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    era?.imageUrl ?? undefined,
  );

  const mutation = useMutation({
    mutationFn: (data: CreateEraInput) =>
      era
        ? $updateEra({ data: { ...data, id: era.id } })
        : $createEra({ data }),
    onSuccess: async () => {
      toast.success(era ? m.admin_era_updated() : m.admin_era_created());
      await queryClient.invalidateQueries({
        queryKey: adminErasQuery().queryKey,
      });
      setOpen(false);
      if (!era) {
        form.reset();
        setSelectedAlbum(null);
      }
      selectedImageRef.current = null;
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(createEraSchema),
    // a new era starts blank
    defaultValues: era
      ? undefined
      : {
          slug: "",
          name: "",
          description: "",
          artist: "",
          spotifyAlbumId: undefined,
          spotifyAlbumArt: undefined,
          imageUrl: undefined,
          startDate: undefined,
          endDate: undefined,
        },
    // an edit follows its era, so the fields update when the era is refetched
    values: era
      ? {
          slug: era.slug,
          name: era.name,
          description: era.description ?? "",
          artist: era.artist,
          spotifyAlbumId: era.spotifyAlbumId ?? undefined,
          spotifyAlbumArt: era.spotifyAlbumArt ?? undefined,
          imageUrl: era.imageUrl ?? undefined,
          startDate: era.startDate ?? undefined,
          endDate: era.endDate ?? undefined,
        }
      : undefined,
  });

  // closing an edit drops its changes, while a new era keeps its draft
  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (era && !open) {
      form.reset();
      selectedImageRef.current = null;
    }
  }

  function handleAlbumSelect(album: SpotifyAlbum) {
    setSelectedAlbum(album);
    form.setValue("spotifyAlbumId", album.id);
    form.setValue("spotifyAlbumArt", album.images[0]?.url);
    form.setValue("name", album.name);
    const slug = slugify(album.name);
    form.setValue("slug", slug);
    selectedImageRef.current = null;
    form.setValue("imageUrl", undefined);
    setCurrentImageUrl(undefined);

    // Try to match album artist to available artists
    const albumArtist = album.artists[0]?.name.toLowerCase();
    if (albumArtist) {
      const matchedArtist = artists.find(
        (a) => a.title.toLowerCase() === albumArtist,
      );
      if (matchedArtist) {
        form.setValue("artist", matchedArtist.id);
      }
    }
  }

  function handleAlbumClear() {
    setSelectedAlbum(null);
    form.setValue("spotifyAlbumId", undefined);
    form.setValue("spotifyAlbumArt", undefined);
  }

  function handleImageSelect(file: File | null) {
    selectedImageRef.current = file;
  }

  function handleImageClear() {
    selectedImageRef.current = null;
    form.setValue("imageUrl", undefined);
    setCurrentImageUrl(undefined);
  }

  async function handleSubmit(data: CreateEraInput) {
    let imageUrl = data.imageUrl;

    // Upload image if selected
    const file = selectedImageRef.current;
    if (file) {
      try {
        imageUrl = await uploadToPresignedUrl(
          () =>
            $getEraImageUploadUrl({
              data: {
                filename: file.name,
                contentType: file.type,
                contentLength: file.size,
              },
            }),
          file,
        );
      } catch {
        toast.error(m.admin_era_image_upload_failed());
        return;
      }
    }

    await mutation.mutateAsync({ ...data, imageUrl });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {era ? (
        <DialogTrigger nativeButton={false} render={children} />
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <IconPlus className="size-4" />
          <span>{m.admin_eras_new()}</span>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {era ? m.admin_era_edit() : m.admin_eras_new()}
          </DialogTitle>
          <DialogDescription>
            {era
              ? m.admin_era_edit_description()
              : m.admin_eras_new_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          {/* react-hook-form reads refs during render by design; fixed upstream in
              facebook/react#35062, pending in oxlint's react-compiler port */}
          {/* oxlint-disable-next-line react/refs */}
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <EraForm
              selectedAlbum={selectedAlbum}
              onAlbumSelect={handleAlbumSelect}
              onAlbumClear={handleAlbumClear}
              existingImageUrl={currentImageUrl}
              onImageSelect={handleImageSelect}
              onImageClear={handleImageClear}
            />
            <DialogFooter className="mt-6">
              {era && (
                <div className="mr-auto">
                  <DeleteEra eraId={era.id} onSuccess={() => setOpen(false)} />
                </div>
              )}

              <DialogClose render={<Button type="button" variant="outline" />}>
                {m.common_cancel()}
              </DialogClose>
              <SubmitButton label={era ? m.common_save() : m.common_create()} />
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
