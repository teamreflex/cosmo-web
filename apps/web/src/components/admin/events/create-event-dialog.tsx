import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import EventForm from "./event-form";
import type { CreateEventInput } from "@/lib/universal/schema/events";
import { createEventSchema } from "@/lib/universal/schema/events";
import { $createEvent } from "@/lib/server/events/actions";
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

export default function CreateEvent() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($createEvent),
    onSuccess: () => {
      toast.success(m.admin_event_created());
      queryClient.invalidateQueries({ queryKey: eventsQuery().queryKey });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error(m.error_unknown());
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
    },
  });

  async function handleSubmit(data: CreateEventInput) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          <span>{m.admin_events_new()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.admin_events_new()}</DialogTitle>
          <DialogDescription>
            {m.admin_events_new_description()}
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
      <span>{m.common_create()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
