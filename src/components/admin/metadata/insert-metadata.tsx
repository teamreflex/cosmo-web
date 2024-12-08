"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clipboard, HardDriveUpload, Loader2, Plus, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { metadataInputSchema, MetadataRow } from "@/lib/universal/metadata";
import { toast } from "@/components/ui/use-toast";
import { saveMetadata } from "./actions";

export default function InsertMetadata() {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<MetadataRow[]>([
    { collectionId: "", description: "" },
  ]);

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
      })
    );
  }

  async function onPaste() {
    const data = await navigator.clipboard.readText();
    const result = metadataInputSchema.safeParse(data);
    if (result.success === false) {
      toast({
        variant: "destructive",
        description:
          "Invalid format: Required format is 'collectionId :: description'",
      });
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

  function submit() {
    startTransition(async () => {
      const result = await saveMetadata(rows);
      if (result.status === "success") {
        toast({
          description: `${rows.length} objekt metadata rows updated`,
        });
        setRows([]);
      } else if (result.status === "error") {
        toast({
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Insert Metadata</h1>
        <Button size="xs" onClick={addRow}>
          <Plus className="size-4 mr-1" /> <span>Add Row</span>
        </Button>
        <Button size="xs" onClick={onPaste}>
          <Clipboard className="size-4 mr-1" /> <span>Fill</span>
        </Button>
        <Button
          variant="cosmo"
          size="xs"
          onClick={submit}
          disabled={isPending || !hasRows}
        >
          {isPending ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <HardDriveUpload className="size-4 mr-1" />
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
