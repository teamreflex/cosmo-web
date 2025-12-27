import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import EventForm from "./event-form";
import type { EventWithEra } from "@apollo/database/web/types";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { createEventSchema } from "@/lib/universal/schema/events";
import { $updateEvent } from "@/lib/server/events/actions";
import { eventsQuery } from "@/lib/queries/events";
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

type Props = {
  event: EventWithEra;
};

export default function EditEventDialog({ event }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($updateEvent),
    onSuccess: () => {
      toast.success(m.admin_event_updated());
      queryClient.invalidateQueries({ queryKey: eventsQuery().queryKey });
      setOpen(false);
    },
    onError: () => {
      toast.error(m.error_unknown());
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
      startDate: event.startDate ?? undefined,
      endDate: event.endDate ?? undefined,
    },
  });

  async function handleSubmit(data: CreateEventInput) {
    await mutation.mutateAsync({ data: { ...data, id: event.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <EventForm />
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
