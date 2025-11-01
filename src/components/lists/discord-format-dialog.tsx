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
import { $generateDiscordList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";
import { m } from "@/i18n/messages";

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
  const mutationFn = useServerFn($generateDiscordList);
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
      toast.error(m.toast_select_both_lists());
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
    toast.success(m.toast_copied_clipboard());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.list_discord_format_title()}</DialogTitle>
          <DialogDescription>
            {m.list_discord_format_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex w-full flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{m.list_discord_have()}</Label>
              <SelectList
                objektLists={objektLists}
                value={haveId}
                onSelect={setHaveId}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{m.list_discord_want()}</Label>
              <SelectList
                objektLists={objektLists}
                value={wantId}
                onSelect={setWantId}
              />
            </div>
          </div>

          <div className="flex w-full justify-center gap-2">
            <Button
              onClick={generate}
              disabled={disabled || mutation.isPending}
            >
              <span>{m.common_generate()}</span>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
            </Button>

            {result && (
              <Button onClick={copy}>
                <span>{m.common_copy()}</span>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {result !== undefined && (
            <ScrollArea className="max-h-60 rounded-lg border border-border">
              <pre className="p-2 font-mono text-sm whitespace-pre-wrap">
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
        <SelectValue placeholder={m.objekt_list()} />
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
