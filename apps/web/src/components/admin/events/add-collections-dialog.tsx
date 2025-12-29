import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { eventCollectionsQuery, eventsQuery } from "@/lib/queries/events";
import { $addCollectionsToEvent } from "@/lib/server/events/actions";
import type { EventCollectionInput } from "@/lib/universal/schema/events";
import { bulkCollectionImportSchema } from "@/lib/universal/schema/events";
import {
  IconClipboard,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  eventId: string;
  eventName: string;
};

export default function AddCollectionsDialog({ eventId, eventName }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<EventCollectionInput[]>([
    { collectionId: "", description: undefined },
  ]);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($addCollectionsToEvent),
    onSuccess: async (data) => {
      toast.success(m.admin_collections_added({ count: data as number }));
      setRows([{ collectionId: "", description: undefined }]);
      await queryClient.invalidateQueries({ queryKey: eventsQuery().queryKey });
      await queryClient.invalidateQueries({
        queryKey: eventCollectionsQuery(eventId).queryKey,
      });
      setOpen(false);
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  const hasRows = rows.some((r) => r.collectionId.length > 0);

  function update(
    index: number,
    key: keyof EventCollectionInput,
    value: string,
  ) {
    setRows((prev) =>
      prev.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            [key]: value,
          };
        }
        return p;
      }),
    );
  }

  async function onPaste() {
    const data = await navigator.clipboard.readText();
    const result = bulkCollectionImportSchema.safeParse(data);
    if (result.success === false) {
      toast.error(m.admin_invalid_format());
      return;
    }

    setRows(result.data);
  }

  function addRow() {
    setRows((prev) => [...prev, { collectionId: "", description: undefined }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!hasRows) return;
    const validRows = rows.filter((r) => r.collectionId.length > 0);
    mutation.mutate({
      data: { eventId, collections: validRows },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <IconPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.admin_add_collections()}</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <Button size="xs" variant="outline" onClick={addRow}>
              <IconPlus className="size-4" />
              <span>{m.admin_add_row()}</span>
            </Button>
            <Button size="xs" variant="outline" onClick={onPaste}>
              <IconClipboard className="size-4" />
              <span>{m.admin_fill()}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  placeholder={m.admin_collection_slug_placeholder()}
                  value={row.collectionId}
                  onChange={(e) =>
                    update(index, "collectionId", e.currentTarget.value)
                  }
                />
                <Input
                  placeholder={m.admin_collection_description_placeholder()}
                  value={row.description ?? ""}
                  onChange={(e) =>
                    update(index, "description", e.currentTarget.value)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(index)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !hasRows}
            className="self-end"
          >
            {mutation.isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconUpload className="size-4" />
            )}
            <span>{m.admin_add_collections()}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
