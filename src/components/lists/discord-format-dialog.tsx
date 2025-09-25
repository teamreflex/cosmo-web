import { CloudDownload, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { generateDiscordList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  objektLists: ObjektList[];
};

export default function DiscordFormatDialog({
  open,
  onOpenChange,
  objektLists,
}: Props) {
  const mutationFn = useServerFn(generateDiscordList);
  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      setResult(data);
    },
  });
  const [result, setResult] = useState<string>();
  const [haveId, setHaveId] = useState<string>();
  const [wantId, setWantId] = useState<string>();
  const [_, copyToClipboard] = useCopyToClipboard();

  const disabled = !haveId || !wantId;

  function generate() {
    if (disabled) {
      toast.error("Please select both lists.");
      return;
    }

    mutation.mutate({
      data: {
        haveId,
        wantId,
      },
    });
  }

  function copy() {
    copyToClipboard(result ?? "");
    toast.success("Copied to clipboard!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Format Lists for Discord</DialogTitle>
          <DialogDescription>
            Select one list as your <strong>have</strong>, and another as your{" "}
            <strong>want</strong>, for easy copying into <i>#objekt-trade</i>.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>Have</Label>
              <SelectList
                objektLists={objektLists}
                value={haveId}
                onSelect={setHaveId}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Want</Label>
              <SelectList
                objektLists={objektLists}
                value={wantId}
                onSelect={setWantId}
              />
            </div>
          </div>

          <div className="w-full flex justify-center gap-2">
            <Button
              onClick={generate}
              disabled={disabled || mutation.isPending}
            >
              <span>Generate</span>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
            </Button>

            {result && (
              <Button onClick={copy}>
                <span>Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {result !== undefined && (
            <ScrollArea className="max-h-60 rounded-lg border border-border">
              <pre className="whitespace-pre-wrap font-mono text-sm p-2">
                {result}
              </pre>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SelectListProps = {
  objektLists: ObjektList[];
  value: string | undefined;
  onSelect: (slug: string) => void;
};

function SelectList({ objektLists, value, onSelect }: SelectListProps) {
  return (
    <Select value={value} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Objekt List" />
      </SelectTrigger>
      <SelectContent>
        {objektLists.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            {list.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
