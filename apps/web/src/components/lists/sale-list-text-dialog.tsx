import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $generateSaleListText } from "@/lib/functions/lists";
import type { ObjektList } from "@apollo/database/web/types";
import { IconCopy, IconLetterCase, IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";

type Props = {
  objektList: ObjektList;
};

/**
 * Header button on the owner's sale list that renders the list as plain text
 * for pasting elsewhere. The text is generated each time the dialog opens.
 */
export default function SaleListTextDialog({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const [_, copyToClipboard] = useCopyToClipboard();
  const mutation = useMutation({
    mutationFn: $generateSaleListText,
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  function handleOpenChange(state: boolean) {
    setOpen(state);
    if (state) {
      mutation.mutate({ data: { id: objektList.id } });
    }
  }

  function copy() {
    void copyToClipboard(mutation.data ?? "");
    toast.success(m.toast_copied_clipboard());
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.aria_format_list_text()}
        >
          <IconLetterCase />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:min-w-xl">
        <DialogHeader>
          <DialogTitle>{m.list_sale_text_title()}</DialogTitle>
          <DialogDescription>
            {m.list_sale_text_description()}
          </DialogDescription>
        </DialogHeader>

        {mutation.isPending && (
          <div className="flex justify-center py-6">
            <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {mutation.data !== undefined && (
          <div className="flex flex-col gap-2">
            <ScrollArea className="max-h-60 rounded-lg border border-border">
              <pre className="p-2 font-mono text-sm whitespace-pre-wrap">
                {mutation.data}
              </pre>
            </ScrollArea>
            <Button onClick={copy}>
              <span>{m.common_copy()}</span>
              <IconCopy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
