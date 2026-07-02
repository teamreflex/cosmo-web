import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import {
  $getCollectionMediaUploadUrl,
  $updateCollection,
} from "@/lib/functions/collections";
import { adminCollectionQuery } from "@/lib/queries/collections";
import {
  type UpdateCollectionInput,
  updateCollectionSchema,
} from "@/lib/universal/schema/collections";
import type { Collection } from "@apollo/database/indexer/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { toast } from "sonner";
import CollectionDisplay from "./collection-display";
import CollectionForm from "./collection-form";
import CollectionRefetchButton from "./collection-refetch-button";

type Props = {
  collection: Collection;
};

function toFormValues(c: Collection): UpdateCollectionInput {
  return {
    id: c.id,
    artist: c.artist,
    member: c.member,
    season: c.season,
    class: c.class,
    collectionNo: c.collectionNo,
    textColor: c.textColor,
    backgroundColor: c.backgroundColor,
    accentColor: c.accentColor,
    onOffline: c.onOffline,
    hasAudio: c.hasAudio,
    frontMedia: c.frontMedia,
  };
}

export default function CollectionEditor({ collection }: Props) {
  const queryClient = useQueryClient();
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const form = useForm({
    resolver: standardSchemaResolver(updateCollectionSchema),
    defaultValues: toFormValues(collection),
  });

  const updateMutation = useMutation({
    mutationFn: $updateCollection,
    onSuccess: async (updated) => {
      toast.success(m.admin_collection_updated());
      await queryClient.invalidateQueries({
        queryKey: adminCollectionQuery(collection.slug).queryKey,
      });
      setStagedFile(null);
      form.reset(toFormValues(updated));
    },
    onError: (error) => toast.error(formatError(error)),
  });

  async function handleSubmit(data: UpdateCollectionInput) {
    let frontMedia = data.frontMedia;

    if (stagedFile) {
      const objektClass =
        data.class === "Motion"
          ? "Motion"
          : data.class === "Double"
            ? "Double"
            : null;

      if (objektClass === null) {
        toast.error(m.admin_collection_media_class_hint());
        return;
      }

      try {
        const { uploadUrl, publicUrl } = await $getCollectionMediaUploadUrl({
          data: {
            slug: collection.slug,
            artist: data.artist,
            objektClass,
            contentType: "video/mp4",
            contentLength: stagedFile.size,
          },
        });

        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: stagedFile,
          headers: { "Content-Type": "video/mp4" },
        });
        if (!res.ok) {
          throw new Error("Upload failed");
        }

        frontMedia = publicUrl;
      } catch {
        toast.error(m.admin_collection_media_upload_failed());
        return;
      }
    }

    await updateMutation.mutateAsync({ data: { ...data, frontMedia } });
  }

  return (
    <FormProvider {...form}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <CollectionDisplay collection={collection} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-mono text-sm font-semibold">
              {collection.collectionId}
            </h2>
            <CollectionRefetchButton id={collection.id} form={form} />
          </div>

          {/* oxlint-disable-next-line react/react-compiler */}
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <CollectionForm
              currentMedia={collection.frontMedia}
              stagedFile={stagedFile}
              onFileSelect={setStagedFile}
            />
            <SubmitButton />
          </form>
        </div>
      </div>
    </FormProvider>
  );
}

function SubmitButton() {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" className="w-fit" disabled={isSubmitting}>
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="size-4 animate-spin" />}
    </Button>
  );
}
