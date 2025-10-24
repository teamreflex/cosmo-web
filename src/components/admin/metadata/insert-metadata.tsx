import { Clipboard, HardDriveUpload, Loader2, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { $saveMetadata } from "./actions";
import type { MetadataRow } from "@/lib/universal/schema/admin";
import { metadataInputSchema } from "@/lib/universal/schema/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InsertMetadata() {
  const [rows, setRows] = useState<MetadataRow[]>([
    { collectionId: "", description: "" },
  ]);
  const mutationFn = useServerFn($saveMetadata);
  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      toast.success(`${data} objekt metadata rows updated`);
      setRows([]);
    },
    onError: () => {
      toast.error("An unknown error occurred");
    },
  });

  const hasRows =
    rows.length > 0 &&
    rows.some((r) => r.collectionId.length > 0 && r.description.length > 0);

  function update(index: number, key: keyof MetadataRow, value: string) {
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
    const result = metadataInputSchema.safeParse(data);
    if (result.success === false) {
      toast.error(
        "Invalid format: Required format is 'collectionId :: description'",
      );
      return;
    }

    setRows(result.data);
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        collectionId: "",
        description: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Insert Metadata</h1>
        <Button size="xs" onClick={addRow}>
          <Plus className="size-4" /> <span>Add Row</span>
        </Button>
        <Button size="xs" onClick={onPaste}>
          <Clipboard className="size-4" /> <span>Fill</span>
        </Button>
        <Button
          variant="cosmo"
          size="xs"
          onClick={() => mutation.mutate({ data: { rows } })}
          disabled={mutation.isPending || !hasRows}
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <HardDriveUpload className="size-4" />
          )}{" "}
          <span>Save</span>
        </Button>
      </div>

      {/* rows */}
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[20%_70%_auto] gap-2">
            <Input
              id="collectionId"
              placeholder="atom01-heejin-101z..."
              value={row.collectionId}
              onChange={(e) =>
                update(index, "collectionId", e.currentTarget.value)
              }
            />

            <Input
              id="description"
              placeholder="Purchased from COSMO..."
              value={row.description}
              onChange={(e) =>
                update(index, "description", e.currentTarget.value)
              }
            />

            <Button variant="destructive" onClick={() => removeRow(index)}>
              <Trash />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
