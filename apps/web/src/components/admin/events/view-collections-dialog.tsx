import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { m } from "@/i18n/messages";
import { IconList } from "@tabler/icons-react";
import { Suspense, useState } from "react";
import EventCollectionsList from "./event-collections-list";

type Props = {
  eventId: string;
  eventName: string;
};

export default function ViewCollectionsDialog({ eventId, eventName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <IconList className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.admin_view_collections()}</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>
        <Suspense fallback={<div>{m.common_loading()}</div>}>
          <EventCollectionsList eventId={eventId} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
