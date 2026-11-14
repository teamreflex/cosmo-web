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
  $createEvent,
  $getEventImageUploadUrl,
  $updateEvent,
} from "@/lib/functions/events";
import { adminEventsQuery } from "@/lib/queries/events";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { createEventSchema } from "@/lib/universal/schema/events";
import type { EventWithEra } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import EventForm from "./event-form";

type Props = {
  // the event to edit; without one the dialog creates an event
  event?: EventWithEra;
};

export default function EventDialog({ event }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const selectedImageRef = useRef<File | null>(null);
  const mutation = useMutation({
    mutationFn: (data: CreateEventInput) =>
      event
        ? $updateEvent({ data: { ...data, id: event.id } })
        : $createEvent({ data }),
    onSuccess: async () => {
      toast.success(event ? m.admin_event_updated() : m.admin_event_created());
      await queryClient.invalidateQueries({
        queryKey: adminEventsQuery().queryKey,
      });
      setOpen(false);
      form.reset();
      selectedImageRef.current = null;
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(createEventSchema),
    // a new event starts blank
    defaultValues: event
      ? undefined
      : {
          slug: "",
          name: "",
          description: "",
          artist: undefined,
          eventType: "album",
          eraId: undefined,
          twitterUrl: undefined,
          discordUrl: undefined,
          startDate: undefined,
          endDate: undefined,
          imageUrl: undefined,
          seasons: [],
        },
    // an edit follows its event, so the fields update when the event is refetched
    values: event
      ? {
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
        }
      : undefined,
  });

  // closing an edit drops its changes, while a new event keeps its draft
  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (event && !open) {
      form.reset();
      selectedImageRef.current = null;
    }
  }

  function handleImageSelect(file: File | null) {
    selectedImageRef.current = file;
  }

  function handleImageClear() {
    selectedImageRef.current = null;
  }

  async function handleSubmit(data: CreateEventInput) {
    let imageUrl = data.imageUrl;

    // Upload image if selected
    const file = selectedImageRef.current;
    if (file) {
      try {
        imageUrl = await uploadToPresignedUrl(
          () =>
            $getEventImageUploadUrl({
              data: {
                filename: file.name,
                contentType: file.type,
                contentLength: file.size,
              },
            }),
          file,
        );
      } catch {
        toast.error(m.admin_event_image_upload_failed());
        return;
      }
    }

    await mutation.mutateAsync({ ...data, imageUrl });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {event ? (
        <DialogTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={m.aria_edit_event()}
            />
          }
        >
          <IconPencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <IconPlus className="size-4" />
          <span>{m.admin_events_new()}</span>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {event ? m.admin_event_edit() : m.admin_events_new()}
          </DialogTitle>
          <DialogDescription>
            {event
              ? m.admin_event_edit_description()
              : m.admin_events_new_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          {/* react-hook-form reads refs during render by design; fixed upstream in
              facebook/react#35062, pending in oxlint's react-compiler port */}
          {/* oxlint-disable-next-line react/refs */}
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Suspense fallback={<div>Loading...</div>}>
              <EventForm
                onImageSelect={handleImageSelect}
                onImageClear={handleImageClear}
              />
            </Suspense>

            <DialogFooter className="mt-6">
              <DialogClose render={<Button type="button" variant="outline" />}>
                {m.common_cancel()}
              </DialogClose>
              <SubmitButton
                label={event ? m.common_save() : m.common_create()}
              />
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
