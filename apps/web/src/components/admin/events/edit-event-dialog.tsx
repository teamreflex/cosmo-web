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
import { adminEventsQuery } from "@/lib/queries/events";
import {
  $getEventImageUploadUrl,
  $updateEvent,
} from "@/lib/server/events/actions";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { createEventSchema } from "@/lib/universal/schema/events";
import type { EventWithEra } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useRef, useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { toast } from "sonner";
import EventForm from "./event-form";

type Props = {
  event: EventWithEra;
};

export default function EditEventDialog({ event }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const selectedImageRef = useRef<File | null>(null);
  const mutation = useMutation({
    mutationFn: $updateEvent,
    onSuccess: async () => {
      toast.success(m.admin_event_updated());
      await queryClient.invalidateQueries({
        queryKey: adminEventsQuery().queryKey,
      });
      setOpen(false);
      form.reset();
      selectedImageRef.current = null;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(createEventSchema),
    values: {
      slug: event.slug,
      name: event.name,
      description: event.description ?? "",
      artist: event.artist,
      eventType: event.eventType,
      eraId: event.eraId,
      twitterUrl: event.twitterUrl ?? undefined,
      discordUrl: event.discordUrl ?? undefined,
      startDate: event.startDate ?? undefined,
      endDate: event.endDate ?? undefined,
      imageUrl: event.imageUrl ?? undefined,
      seasons: event.seasons,
    },
  });

  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (!open) {
      form.reset();
      selectedImageRef.current = null;
    }
  }

  function handleImageSelect(file: File | null) {
    selectedImageRef.current = file;
  }

  function handleImageClear() {
    selectedImageRef.current = null;
    form.setValue("imageUrl", undefined);
  }

  async function handleSubmit(data: CreateEventInput) {
    let imageUrl = data.imageUrl;

    // Upload image if selected
    if (selectedImageRef.current) {
      try {
        const file = selectedImageRef.current;
        const { uploadUrl, publicUrl } = await $getEventImageUploadUrl({
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
        toast.error(m.admin_event_image_upload_failed());
        return;
      }
    }

    await mutation.mutateAsync({ data: { ...data, imageUrl, id: event.id } });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <IconPencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.admin_event_edit()}</DialogTitle>
          <DialogDescription>
            {m.admin_event_edit_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Suspense fallback={<div>Loading...</div>}>
              <EventForm
                existingImageUrl={event.imageUrl ?? undefined}
                onImageSelect={handleImageSelect}
                onImageClear={handleImageClear}
              />
            </Suspense>
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
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
