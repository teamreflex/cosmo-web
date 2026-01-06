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
  $createEvent,
  $getEventImageUploadUrl,
} from "@/lib/server/events/actions";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { createEventSchema } from "@/lib/universal/schema/events";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useRef, useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { toast } from "sonner";
import EventForm from "./event-form";

export default function CreateEvent() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const selectedImageRef = useRef<File | null>(null);
  const mutation = useMutation({
    mutationFn: $createEvent,
    onSuccess: async () => {
      toast.success(m.admin_event_created());
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
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      artist: undefined,
      eventType: "album",
      eraId: undefined,
      twitterUrl: undefined,
      startDate: undefined,
      endDate: undefined,
      imageUrl: undefined,
      seasons: [],
    },
  });

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

    await mutation.mutateAsync({ data: { ...data, imageUrl } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          <span>{m.admin_events_new()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.admin_events_new()}</DialogTitle>
          <DialogDescription>
            {m.admin_events_new_description()}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Suspense fallback={<div>Loading...</div>}>
              <EventForm
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
      <span>{m.common_create()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
