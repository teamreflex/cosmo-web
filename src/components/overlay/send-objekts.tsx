import {
  Selection,
  SelectionCanceled,
  SelectionError,
  SelectionIdle,
  SelectionPending,
  SelectionSuccess,
  useObjektSelection,
} from "@/hooks/use-objekt-selection";
import {
  Ban,
  CheckCircle,
  CircleDashed,
  ExternalLink,
  Loader2,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { cn, track } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { useState } from "react";
import VisuallyHidden from "../ui/visually-hidden";
import { ScrollArea } from "../ui/scroll-area";
import Image from "next/image";
import { Button } from "../ui/button";
import { useSendObjekt, WALLET_MISSING } from "@/hooks/use-wallet-transaction";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import { UserSearch } from "../user-search";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { toast } from "../ui/use-toast";
import { match } from "ts-pattern";
import { getErrorMessage } from "@/lib/error";
import { getTransactionCount } from "viem/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { IconZoomExclamation } from "@tabler/icons-react";

type SendState = "select" | "send";

export default function SendObjekts() {
  const open = useObjektSelection((ctx) => ctx.open);
  const setOpen = useObjektSelection((ctx) => ctx.setOpen);
  const selected = useObjektSelection((ctx) => ctx.selected);
  const reset = useObjektSelection((ctx) => ctx.reset);
  const [state, setState] = useState<SendState>("select");

  const text = selected.length === 1 ? "objekt" : "objekts";

  // prevent closing if there are pending transactions
  function onOpenChange(open: boolean) {
    const hasPending = selected.some(
      (selection) => selection.status === "pending"
    );

    if (hasPending) {
      return;
    }

    setOpen(open);
    setState("select");
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      preventScrollRestoration={true}
    >
      <div
        className={cn(
          "z-50 fixed bottom-2 container flex justify-center items-center gap-2 pointer-events-none"
        )}
      >
        <DrawerTrigger
          className={cn(
            "h-10 w-fit rounded-full bg-cosmo hover:scale-105 text-white font-semibold flex items-center gap-2 px-3 py-1 drop-shadow-lg transition-all opacity-0",
            selected.length > 0 && "opacity-100 pointer-events-auto"
          )}
        >
          <Send />
          <Separator orientation="vertical" className="bg-cosmo saturate-50" />
          <span className="tabular-nums">
            {selected.length} {text} selected
          </span>
        </DrawerTrigger>

        <button
          onClick={reset}
          className={cn(
            "h-10 w-fit aspect-square rounded-full bg-cosmo hover:scale-105 text-white flex justify-center items-center drop-shadow-lg transition-all opacity-0 mr-8",
            selected.length > 0 && "opacity-100 pointer-events-auto"
          )}
        >
          <X />
        </button>
      </div>

      <Content
        state={state}
        selected={selected}
        setState={setState}
        onClose={() => setOpen(false)}
      />
    </Drawer>
  );
}

type ContentProps = {
  selected: Selection[];
  state: SendState;
  setState: (state: SendState) => void;
  onClose: () => void;
};

function Content({ selected, state, setState, onClose }: ContentProps) {
  const reset = useObjektSelection((ctx) => ctx.reset);

  function onSelectComplete() {
    setState("send");
  }

  function onBack() {
    setState("select");
  }

  function onSendComplete() {
    reset();
    setState("select");
    onClose();
  }

  return (
    <DrawerContent className="w-full md:w-fit md:mx-auto">
      {state === "select" && (
        <SelectRecipients selected={selected} onComplete={onSelectComplete} />
      )}

      {state === "send" && (
        <Sending selected={selected} onBack={onBack} onClose={onSendComplete} />
      )}
    </DrawerContent>
  );
}

type SelectRecipientsProps = {
  selected: Selection[];
  onComplete: () => void;
};

function SelectRecipients({ selected, onComplete }: SelectRecipientsProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const selectUser = useObjektSelection((ctx) => ctx.selectUser);
  const isDisabled =
    selected.length === 0 ||
    selected.some((selection) => selection.recipient === null);

  const text = selected.length === 1 ? "Objekt" : "Objekts";

  function onSelect(user: CosmoPublicUser) {
    setSearchOpen(false);
    selectUser(user);
  }

  return (
    <div className="contents">
      <DrawerHeader className="pb-2">
        <DrawerTitle>
          Send {selected.length} {text}
        </DrawerTitle>
        <VisuallyHidden>
          <DrawerDescription>Select users and confirm</DrawerDescription>
        </VisuallyHidden>
      </DrawerHeader>

      {selected.length > 1 && (
        <div className="flex flex-col gap-2 px-4 py-2">
          <UserSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onSelect={onSelect}
            authenticated={true}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchOpen(true)}
            >
              Select Recipient For All
            </Button>
          </UserSearch>
        </div>
      )}

      <Separator orientation="horizontal" className="my-2" />

      <ScrollArea className="w-full min-h-28 max-h-[calc(100dvh-20rem)] overflow-y-auto">
        <div className="flex flex-col divide-y divide-accent">
          {selected.map((selection) => (
            <SelectRecipientRow
              selection={selection}
              key={selection.objekt.tokenId}
            />
          ))}
        </div>
      </ScrollArea>

      <DrawerFooter className="flex flex-row justify-center items-center gap-2">
        <DrawerClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DrawerClose>
        <Button onClick={onComplete} disabled={isDisabled}>
          Confirm
        </Button>
      </DrawerFooter>
    </div>
  );
}

type RowProps = {
  selection: Selection;
};

function SelectRecipientRow({ selection }: RowProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const remove = useObjektSelection((ctx) => ctx.remove);
  const selectUserForToken = useObjektSelection(
    (ctx) => ctx.selectUserForToken
  );

  function onUserSelect(user: CosmoPublicUser) {
    setSearchOpen(false);
    selectUserForToken(selection.objekt.tokenId, user);
  }

  return (
    <div className="flex flex-row gap-4 py-2 px-4">
      <div className="relative aspect-photocard h-24">
        <Image
          className="object-cover"
          src={selection.objekt.thumbnailImage}
          fill={true}
          alt={selection.objekt.collectionId}
        />
      </div>
      <div className="flex flex-col justify-between w-full">
        {/* objekt info */}
        <div className="flex flex-row justify-between items-center gap-4">
          <span className="font-semibold">{selection.objekt.collectionId}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              #{selection.objekt.serial.toString().padStart(5, "0")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => remove(selection.objekt.tokenId)}
              aria-label="Remove selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* user selection */}
        {selection.recipient !== null && (
          <div className="flex items-center gap-2">
            <Send className="size-5" />
            <span className="text-sm">{selection.recipient.nickname}</span>
          </div>
        )}

        <UserSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={onUserSelect}
          authenticated={true}
        >
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setSearchOpen(true)}
          >
            Select Recipient
          </Button>
        </UserSearch>
      </div>
    </div>
  );
}

type SendingProps = {
  selected: Selection[];
  onClose: () => void;
  onBack: () => void;
};

function Sending({ selected, onBack, onClose }: SendingProps) {
  const [isSending, setIsSending] = useState(false);
  const { wallet } = useWallet();
  const { send } = useSendObjekt();
  const update = useObjektSelection((ctx) => ctx.update);
  const queryClient = useQueryClient();

  const isSuccess = selected.every(
    (selection) => selection.status === "success"
  );
  const hasError = selected.some((selection) => selection.status === "error");

  async function onSend() {
    if (!wallet) {
      toast({
        variant: "destructive",
        description: WALLET_MISSING,
      });
      return;
    }

    setIsSending(true);

    // get first nonce
    const nonce = await getTransactionCount(wallet, {
      address: wallet.account.address,
    });

    // loop over each selection and send it
    for (let i = 0; i < selected.length; i++) {
      const selection = selected[i] as SelectionIdle;

      try {
        // scroll row into view
        const row = document.getElementById(
          `sending-${selection.objekt.tokenId}`
        );
        if (row) {
          row.scrollIntoView({ behavior: "smooth" });
        }

        // update the selection to pending
        update({
          ...selection,
          status: "pending",
        } satisfies SelectionPending);

        // send the objekt
        const hash = await send({
          to: selection.recipient!.address,
          tokenId: selection.objekt.tokenId,
          contract: selection.objekt.contract,
          nonce: nonce + i,
          opts: {
            mutationKey: ["send-objekt", selection.objekt.tokenId],
          },
        });

        // update the selection to success
        update({
          ...selection,
          status: "success",
          hash: hash ?? "",
        } satisfies SelectionSuccess);
        // track("send-objekt");
      } catch (error) {
        // update the selection to error
        update({
          ...selection,
          status: "error",
          error: getErrorMessage(error),
        } satisfies SelectionError);

        // update everything else to canceled
        for (let j = i + 1; j < selected.length; j++) {
          const toCancel = selected[j] as SelectionIdle;
          update({
            ...toCancel,
            status: "canceled",
          } satisfies SelectionCanceled);
        }

        /**
         * break out of the loop on the first error
         * this is to prevent any nonces from being missed
         */
        break;
      }
    }

    // invalidate the collection query to refresh the UI
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ["collection"],
      });
    }, 1500);
  }

  if (isSending) {
    return (
      <div className="contents">
        <ScrollArea className="w-full min-h-28 max-h-[calc(100dvh-20rem)] overflow-y-auto">
          <div className="flex flex-col divide-y divide-accent">
            {selected.map((selection) => (
              <SendingRow
                selection={selection}
                key={selection.objekt.tokenId}
              />
            ))}
          </div>
        </ScrollArea>

        {(isSuccess || hasError) && (
          <DrawerFooter className="flex flex-row justify-center items-center gap-2">
            <Button onClick={onClose}>Close</Button>
          </DrawerFooter>
        )}
      </div>
    );
  }

  return (
    <div className="contents">
      <DrawerHeader>
        <DrawerTitle>Confirm</DrawerTitle>
        <DrawerDescription>
          Are you sure you want to send? This cannot be undone.
        </DrawerDescription>
      </DrawerHeader>

      <DrawerFooter className="flex flex-row justify-center items-center gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSend}>Send</Button>
      </DrawerFooter>
    </div>
  );
}

function SendingRow({ selection }: RowProps) {
  const id = `sending-${selection.objekt.tokenId}`;
  return (
    <div id={id} className="flex flex-row gap-4 py-2 px-4">
      <div className="relative aspect-photocard h-24">
        <Image
          className="object-cover"
          src={selection.objekt.thumbnailImage}
          fill={true}
          alt={selection.objekt.collectionId}
        />
      </div>
      <div className="flex flex-col w-full">
        {/* objekt info */}
        <div className="flex flex-row justify-between items-center gap-4">
          <span className="font-semibold">{selection.objekt.collectionId}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              #{selection.objekt.serial.toString().padStart(5, "0")}
            </span>
          </div>
        </div>

        {/* status */}
        {match(selection)
          .with({ status: "idle" }, () => (
            <div className="flex flex-row gap-2 items-center">
              <CircleDashed className="h-4 w-4" />
              <span className="text-sm">Pending</span>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div className="flex flex-row gap-2 items-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Sending</span>
            </div>
          ))
          .with({ status: "success" }, (selection) => (
            <div className="flex flex-col">
              <div className="flex flex-row gap-2 items-center">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Success</span>
              </div>
              <a
                className="text-sm underline flex items-center gap-1"
                href={`https://polygonscan.com/tx/${selection.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>View on PolygonScan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-row gap-2 items-center">
                <TriangleAlert className="h-4 w-4" />
                <span className="text-sm">Error</span>
              </div>

              {error !== undefined && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="xs" className="w-fit">
                      <IconZoomExclamation className="size-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Transaction Error</AlertDialogTitle>
                      <AlertDialogDescription>{error}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))
          .with({ status: "canceled" }, () => (
            <div className="flex flex-row gap-2 items-center">
              <Ban className="h-4 w-4" />
              <span className="text-sm">Canceled</span>
            </div>
          ))
          .exhaustive()}
      </div>
    </div>
  );
}
