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
import { adminErasQuery } from "@/lib/queries/events";
import { $createEra, $getEraImageUploadUrl } from "@/lib/server/events/actions";
import type { SpotifyAlbum } from "@/lib/universal/events";
import type { CreateEraInput } from "@/lib/universal/schema/events";
import { createEraSchema } from "@/lib/universal/schema/events";
import { slugify } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { toast } from "sonner";
import EraForm from "./era-form";

const route = getRouteApi("/admin/eras");

export default function CreateEra() {
  const { artists } = route.useLoaderData();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const selectedImageRef = useRef<File | null>(null);

  const mutation = useMutation({
    mutationFn: $createEra,
    onSuccess: async () => {
      toast.success(m.admin_era_created());
      await queryClient.invalidateQueries({
        queryKey: adminErasQuery().queryKey,
      });
      setOpen(false);
      form.reset();
      setSelectedAlbum(null);
      selectedImageRef.current = null;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(createEraSchema),
    defaultValues: {
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
  });

  function handleAlbumSelect(album: SpotifyAlbum) {
    setSelectedAlbum(album);
    form.setValue("spotifyAlbumId", album.id);
    form.setValue("spotifyAlbumArt", album.images[0]?.url);
    form.setValue("name", album.name);
    const slug = slugify(album.name);
    form.setValue("slug", slug);
    selectedImageRef.current = null;
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

    await mutation.mutateAsync({ data: { ...data, imageUrl } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          <span>{m.admin_eras_new()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.admin_eras_new()}</DialogTitle>
          <DialogDescription>
            {m.admin_eras_new_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <EraForm
              selectedAlbum={selectedAlbum}
              onAlbumSelect={handleAlbumSelect}
              onAlbumClear={handleAlbumClear}
              onImageSelect={handleImageSelect}
              onImageClear={handleImageClear}
            />
            <DialogFooter className="mt-6">
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
      <span>{m.common_create()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
