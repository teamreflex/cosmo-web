import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { saleListTextQuery } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import { IconCopy, IconLetterCase, IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useTransition } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";

type Props = {
  objektList: ObjektList;
};

type TextOptions = {
  unpricedAsOffers: boolean;
  includeLink: boolean;
};

/**
 * Header button on the owner's sale list that renders the list as plain text
 * for pasting elsewhere. The text is regenerated each time the dialog opens.
 */
export default function SaleListTextDialog({ objektList }: Props) {
  const [options, setOptions] = useState<TextOptions>({
    unpricedAsOffers: true,
    includeLink: true,
  });
  // keeps the previous text on screen while the new options load
  const [pending, startTransition] = useTransition();

  function setOption(key: keyof TextOptions, checked: boolean) {
    startTransition(() => setOptions((prev) => ({ ...prev, [key]: checked })));
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.aria_format_list_text()}
          />
        }
      >
        <IconLetterCase />
      </DialogTrigger>
      <DialogContent className="sm:min-w-xl">
        <DialogHeader>
          <DialogTitle>{m.list_sale_text_title()}</DialogTitle>
          <DialogDescription>
            {m.list_sale_text_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Label>
              <Checkbox
                checked={options.unpricedAsOffers}
                onCheckedChange={(checked) =>
                  setOption("unpricedAsOffers", checked)
                }
              />
              {m.list_sale_text_unpriced_offers()}
            </Label>
            <Label>
              <Checkbox
                checked={options.includeLink}
                onCheckedChange={(checked) => setOption("includeLink", checked)}
              />
              {m.list_sale_text_include_link()}
            </Label>
          </div>

          <ErrorBoundary
            resetKeys={[options]}
            fallbackRender={({ error }) => (
              <Message>{formatError(error)}</Message>
            )}
          >
            <Suspense
              fallback={
                <div className="flex justify-center py-6">
                  <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <SaleListText
                id={objektList.id}
                options={options}
                pending={pending}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SaleListTextProps = {
  id: string;
  options: TextOptions;
  pending: boolean;
};

function SaleListText({ id, options, pending }: SaleListTextProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { data } = useSuspenseQuery(saleListTextQuery({ id, ...options }));

  if (data === "") {
    return <Message>{m.list_sale_text_nothing_priced()}</Message>;
  }

  return (
    <>
      <ScrollArea className="max-h-60 rounded-lg border border-border">
        <pre className="p-2 font-mono text-sm whitespace-pre-wrap">{data}</pre>
      </ScrollArea>
      <Button
        onClick={() => {
          void copyToClipboard(data);
          toast.success(m.toast_copied_clipboard());
        }}
        disabled={pending}
      >
        <span>{m.common_copy()}</span>
        <IconCopy className="h-4 w-4" />
      </Button>
    </>
  );
}

function Message({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
