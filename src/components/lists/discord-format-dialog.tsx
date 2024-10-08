import { CloudDownload, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ObjektList } from "@/lib/universal/objekts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState, useTransition } from "react";
import { toast } from "../ui/use-toast";
import { generateDiscordList } from "./actions";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { useCopyToClipboard } from "usehooks-ts";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  lists: ObjektList[];
};

export default function DiscordFormatDialog({
  open,
  onOpenChange,
  lists,
}: Props) {
  const [slugHave, setSlugHave] = useState<string>();
  const [slugWant, setSlugWant] = useState<string>();
  const [result, setResult] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [_, copyToClipboard] = useCopyToClipboard();

  const disabled = !slugHave || !slugWant;

  function generate() {
    if (disabled) {
      toast({
        variant: "destructive",
        description: "Please select both lists.",
      });
      return;
    }

    startTransition(async () => {
      const result = await generateDiscordList({
        have: slugHave,
        want: slugWant,
      });
      if (result.status === "success") {
        setResult(result.data);
      }
    });
  }

  function copy() {
    copyToClipboard(result!);
    toast({
      description: "Copied to clipboard!",
    });
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
                lists={lists}
                value={slugHave}
                onSelect={setSlugHave}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Want</Label>
              <SelectList
                lists={lists}
                value={slugWant}
                onSelect={setSlugWant}
              />
            </div>
          </div>

          <div className="w-full flex justify-center gap-2">
            <Button onClick={generate} disabled={disabled || isPending}>
              <span>Generate</span>
              {isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="ml-2 h-4 w-4" />
              )}
            </Button>

            {result && (
              <Button onClick={copy}>
                <span>Copy</span>
                <Copy className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {result && (
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
  lists: ObjektList[];
  value: string | undefined;
  onSelect: (slug: string) => void;
};

function SelectList({ lists, value, onSelect }: SelectListProps) {
  return (
    <Select value={value} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Objekt List" />
      </SelectTrigger>
      <SelectContent
        ref={(ref) => {
          // fixes mobile touch-through bug in radix
          if (!ref) return;
          ref.ontouchstart = (e) => {
            e.preventDefault();
          };
        }}
      >
        {lists.map((list) => (
          <SelectItem key={list.id} value={list.slug}>
            {list.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
