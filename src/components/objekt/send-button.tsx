"use client";

import { cn, track } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, Satellite, Send } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useSearchStore } from "@/store";
import {
  SUPPORTED_ETHEREUM_CHAIN_IDS,
  getRamperSigner,
  getUser,
} from "@ramper/ethereum";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { env } from "@/env.mjs";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlippableObjekt } from "./objekt";
import { useQueryClient } from "@tanstack/react-query";
import {
  TransactionError,
  encodeObjektTransfer,
  fetchGasLimit,
  fetchGasStation,
  fetchNonce,
  sendTransaction,
  signTransaction,
} from "@/lib/client/blockchain";
import { UserSearch } from "../user-search";
import Link from "next/link";
import ObjektSidebar from "./objekt-sidebar";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { providers } from "ethers";

type Props = {
  objekt: OwnedObjekt;
};

enum TransactionStatus {
  ERROR = -1,
  WAITING = 0,
  GET_USER = 1,
  GET_NONCE = 2,
  ENCODE_TRANSACTION = 3,
  GET_GAS_LIMIT = 4,
  GET_FEE_DATA = 5,
  SIGN_TRANSACTION = 6,
  SEND_TRANSACTION = 7,
  PENDING_TRANSACTION = 8,
  COMPLETE = 9,
}

const instagrams = [
  "0ct0ber19",
  "withaseul",
  "kimxxlip",
  "zindoriyam",
  "cher_ryppo",
];

export default function SendObjekt({ objekt }: Props) {
  const [openSearch, setOpenSearch] = useState(false);
  const [openSend, setOpenSend] = useState(false);
  const [recipient, setRecipient] = useState<CosmoPublicUser | null>(null);
  const [transactionProgress, setTransactionProgress] =
    useState<TransactionStatus>(TransactionStatus.WAITING);
  const [transactionHash, setTransactionHash] = useState("");

  const recent = useSearchStore((state) => state.recentSends);
  const addRecent = useSearchStore((state) => state.addRecentSend);

  const queryClient = useQueryClient();

  function prepareSending(newRecipient: CosmoPublicUser) {
    addRecent(newRecipient);
    setRecipient(newRecipient);
    setOpenSearch(false);
    setOpenSend(true);
  }

  function updateProgress(progress: TransactionStatus, txHash?: string) {
    if (txHash) {
      setTransactionHash(txHash);
    }

    if (progress === TransactionStatus.COMPLETE) {
      // refresh collection upon transfer
      setTimeout(
        () =>
          queryClient.invalidateQueries({
            queryKey: ["collection"],
          }),
        1000
      );
    }

    setTransactionProgress(progress);
  }

  // close modal and reset state
  function onOpenChange(state: boolean) {
    setOpenSend(state);
    setTransactionProgress(TransactionStatus.WAITING);
    setRecipient(null);
  }

  const placeholder =
    instagrams[
      Math.floor(Math.random() * (1 + (instagrams.length - 1) - 0)) + 0
    ];

  return (
    <>
      <UserSearch
        placeholder={`Send ${objekt.collectionId} to ${placeholder}...`}
        open={openSearch}
        onOpenChange={setOpenSearch}
        onSelect={prepareSending}
        recent={recent}
        authenticated={true}
      >
        <button
          onClick={() => setOpenSearch(true)}
          className={cn(
            objekt.transferable && "hover:scale-110 transition-all"
          )}
        >
          {objekt.transferable && <Send className="h-3 w-3 sm:h-5 sm:w-5" />}
        </button>
      </UserSearch>

      {recipient && (
        <Dialog open={openSend} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {transactionProgress === TransactionStatus.WAITING
                  ? "Send"
                  : "Sending"}{" "}
                Objekt
              </DialogTitle>
              {transactionProgress === TransactionStatus.WAITING && (
                <DialogDescription>
                  Are you sure you want to send this objekt to{" "}
                  <span className="font-bold">{recipient.nickname}</span>?
                </DialogDescription>
              )}
            </DialogHeader>

            {/* show error state */}
            {transactionProgress === TransactionStatus.ERROR && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <AlertTriangle className="h-10 w-10" />
                <p className="text-sm">
                  There was an error sending your objekt, please check your
                  collection and try again.
                </p>
              </div>
            )}

            {/* show waiting for mined tx state */}
            {transactionProgress === TransactionStatus.PENDING_TRANSACTION && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <Satellite className="h-16 w-16 animate-pulse" />
                <p className="text-sm">Waiting for transaction...</p>
                <Link
                  className="text-sm underline"
                  href={`https://polygonscan.com/tx/${transactionHash}`}
                  target="_blank"
                >
                  View on PolygonScan
                </Link>
              </div>
            )}

            {/* show complete state */}
            {transactionProgress === TransactionStatus.COMPLETE && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <Check className="h-16 w-16" />
                <p className="text-sm">Objekt sent to {recipient.nickname}!</p>
                <Link
                  className="text-sm underline"
                  href={`https://polygonscan.com/tx/${transactionHash}`}
                  target="_blank"
                >
                  View on PolygonScan
                </Link>
              </div>
            )}

            {/* progress bar while sending */}
            {transactionProgress !== TransactionStatus.WAITING &&
              transactionProgress !== TransactionStatus.PENDING_TRANSACTION &&
              transactionProgress !== TransactionStatus.COMPLETE &&
              transactionProgress !== TransactionStatus.ERROR && (
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Satellite className="h-16 w-16 animate-pulse" />
                  <p className="text-sm">
                    Sending objekt to {recipient.nickname}...
                  </p>
                </div>
              )}

            {/* show preview before sending */}
            {transactionProgress === TransactionStatus.WAITING && (
              <div className="flex flex-col gap-4 justify-center items-center">
                <FlippableObjekt objekt={objekt} id={objekt.tokenId}>
                  <ObjektSidebar
                    collection={objekt.collectionNo}
                    serial={objekt.objektNo}
                  />
                </FlippableObjekt>
              </div>
            )}

            {/* buttons as part of preview */}
            {transactionProgress === TransactionStatus.WAITING && (
              <DialogFooter className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setOpenSend(false)}
                >
                  Cancel
                </Button>
                <SendToUserButton
                  objekt={objekt}
                  user={recipient}
                  updateTransactionProgress={updateProgress}
                />
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type SendToUserButtonProps = {
  objekt: OwnedObjekt;
  user: CosmoPublicUser;
  updateTransactionProgress: (
    status: TransactionStatus,
    txHash?: string
  ) => void;
};

function SendToUserButton({
  objekt,
  user,
  updateTransactionProgress,
}: SendToUserButtonProps) {
  const { toast } = useToast();

  async function sendObjekt() {
    setPending(true);
    const ramperUser = getUser();
    const wallet = ramperUser!.wallets["ethereum"];
    const alchemy = new providers.AlchemyProvider(
      SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
      env.NEXT_PUBLIC_ALCHEMY_KEY
    );

    try {
      const ramperSigner = await getRamperSigner(alchemy);
      updateTransactionProgress(TransactionStatus.GET_USER);

      const value = parseEther("0.0");
      const nonce = await fetchNonce(alchemy, wallet.publicKey);
      updateTransactionProgress(TransactionStatus.GET_NONCE);
      const customData = encodeObjektTransfer(
        wallet.publicKey,
        user.address,
        objekt.tokenId
      );
      updateTransactionProgress(TransactionStatus.ENCODE_TRANSACTION);
      const gasLimit = await fetchGasLimit(
        alchemy,
        objekt.tokenAddress,
        customData
      );
      updateTransactionProgress(TransactionStatus.GET_GAS_LIMIT);
      // const feeData = await fetchFeeData(alchemy);
      const gasStation = await fetchGasStation();
      updateTransactionProgress(TransactionStatus.GET_FEE_DATA);

      // get confirmation from user
      const signResult = await signTransaction(
        objekt.tokenAddress,
        ramperSigner,
        wallet.publicKey,
        value,
        nonce,
        gasLimit,
        parseUnits(gasStation.fast.maxFee.toString(), "gwei"),
        parseUnits(gasStation.fast.maxPriorityFee.toString(), "gwei"),
        customData
      );
      updateTransactionProgress(TransactionStatus.SIGN_TRANSACTION);

      const transaction = await sendTransaction(alchemy, signResult);
      updateTransactionProgress(TransactionStatus.SEND_TRANSACTION);

      toast({
        description: "Transaction submitted!",
        variant: "default",
      });
      updateTransactionProgress(TransactionStatus.COMPLETE, transaction.hash);

      track("send-objekt");
    } catch (err) {
      if (err instanceof TransactionError) {
        updateTransactionProgress(TransactionStatus.ERROR);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    }

    setPending(false);
  }

  const [pending, setPending] = useState(false);

  return (
    <Button variant="default" disabled={pending} onClick={() => sendObjekt()}>
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <span className="flex gap-2 items-center">
          <Send />
          <span>Send!</span>
        </span>
      )}
    </Button>
  );
}
