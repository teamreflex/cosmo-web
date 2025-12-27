import { IconLoader2 } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import DeleteEra from "./delete-era";
import EraForm from "./era-form";
import type { Era } from "@apollo/database/web/types";
import type { SpotifyAlbum } from "@/lib/universal/events";
import type { CreateEraInput } from "@/lib/universal/schema/events";
import { createEraSchema } from "@/lib/universal/schema/events";
import { $getEraImageUploadUrl, $updateEra } from "@/lib/server/events/actions";
import { erasQuery } from "@/lib/queries/events";
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

const route = getRouteApi("/admin/eras");

type Props = {
  era: Era;
  children: React.ReactNode;
};

export default function EditEraDialog({ era, children }: Props) {
  const { artists } = route.useLoaderData();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const selectedImageRef = useRef<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    era.imageUrl ?? undefined,
  );

  const mutation = useMutation({
    mutationFn: useServerFn($updateEra),
    onSuccess: () => {
      toast.success(m.admin_era_updated());
      queryClient.invalidateQueries({ queryKey: erasQuery().queryKey });
      setOpen(false);
      selectedImageRef.current = null;
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(createEraSchema),
    values: {
      slug: era.slug,
      name: era.name,
      description: era.description ?? "",
      artist: era.artist,
      spotifyAlbumId: era.spotifyAlbumId ?? undefined,
      spotifyAlbumArt: era.spotifyAlbumArt ?? undefined,
      imageUrl: era.imageUrl ?? undefined,
      startDate: era.startDate ?? undefined,
      endDate: era.endDate ?? undefined,
    },
  });

  function handleAlbumSelect(album: SpotifyAlbum) {
    setSelectedAlbum(album);
    form.setValue("spotifyAlbumId", album.id);
    form.setValue("spotifyAlbumArt", album.images[0]?.url);
    form.setValue("name", album.name);
    const slug = album.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    form.setValue("slug", slug);
    selectedImageRef.current = null;
    setCurrentImageUrl(undefined);
    form.setValue("imageUrl", undefined);

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
    setCurrentImageUrl(undefined);
    form.setValue("imageUrl", undefined);
  }

  async function handleSubmit(data: CreateEraInput) {
    let imageUrl = data.imageUrl;

    // Upload image if selected
    if (selectedImageRef.current) {
      try {
        const file = selectedImageRef.current;
        const { uploadUrl, publicUrl } = await $getEraImageUploadUrl({
          data: {
            filename: file.name,
            contentType: file.type,
            contentLength: file.size,
          },
        });

        // Upload to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        imageUrl = publicUrl;
      } catch {
        toast.error(m.admin_era_image_upload_failed());
        return;
      }
    }

    await mutation.mutateAsync({ data: { ...data, imageUrl, id: era.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.admin_era_edit()}</DialogTitle>
          <DialogDescription>
            {m.admin_era_edit_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
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
              <div className="mr-auto">
                <DeleteEra eraId={era.id} onSuccess={() => setOpen(false)} />
              </div>

              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {m.common_cancel()}
                </Button>
              </DialogClose>
              <SubmitButton />
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" disabled={isSubmitting}>
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
