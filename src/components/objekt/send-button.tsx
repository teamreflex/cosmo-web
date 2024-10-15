"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Satellite, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Fragment, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlippableObjekt } from "./objekt";
import { UserSearch } from "../user-search";
import Link from "next/link";
import ObjektSidebar from "./objekt-sidebar";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { useSendObjekt } from "@/hooks/use-wallet-transaction";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  objekt: OwnedObjekt;
};

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
  const { send, status, hash } = useSendObjekt();
  const queryClient = useQueryClient();

  function prepareSending(newRecipient: CosmoPublicUser) {
    setRecipient(newRecipient);
    setOpenSearch(false);
    setOpenSend(true);
  }

  // close modal and reset state
  function onOpenChange(state: boolean) {
    setOpenSend(state);
    setRecipient(null);
  }

  function sendObjekt(recipientAddress: string) {
    send(
      {
        to: recipientAddress,
        contract: objekt.tokenAddress,
        tokenId: Number(objekt.tokenId),
      },
      {
        // refresh collection query
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["collection"],
          });
        },
      }
    );
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
        authenticated={true}
        recent={[]}
      >
        <button
          onClick={() => setOpenSearch(true)}
          className="hover:cursor-pointer hover:scale-110 transition-all flex items-center"
        >
          <Send className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </UserSearch>

      {recipient && (
        <Dialog open={openSend} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {status === "pending" ? "Sending" : "Send"} Objekt
              </DialogTitle>
              {status === "idle" && (
                <DialogDescription>
                  Are you sure you want to send this objekt to{" "}
                  <span className="font-bold">{recipient.nickname}</span>?
                </DialogDescription>
              )}
            </DialogHeader>

            {/* error state */}
            {status === "error" && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <AlertTriangle className="h-10 w-10" />
                <p className="text-sm">
                  There was an error sending your objekt, please check your
                  collection and try again.
                </p>
              </div>
            )}

            {/* success state */}
            {status === "success" && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <CheckCircle className="h-16 w-16" />
                <p className="text-sm">Objekt sent to {recipient.nickname}!</p>
                <Link
                  className="text-sm underline"
                  href={`https://polygonscan.com/tx/${hash}`}
                  target="_blank"
                >
                  View on PolygonScan
                </Link>
              </div>
            )}

            {/* pending state */}
            {status === "pending" && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <Satellite className="h-16 w-16 animate-pulse" />
                <p className="text-sm">
                  Sending objekt to {recipient.nickname}...
                </p>
              </div>
            )}

            {/* idle state (preview) */}
            {status === "idle" && (
              <Fragment>
                <div className="flex flex-col gap-4 justify-center items-center">
                  <FlippableObjekt objekt={objekt} id={objekt.tokenId}>
                    <ObjektSidebar
                      collection={objekt.collectionNo}
                      serial={objekt.objektNo}
                    />
                  </FlippableObjekt>
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setOpenSend(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => sendObjekt(recipient.address)}
                  >
                    <Send className="mr-2" />
                    <span>Send!</span>
                  </Button>
                </DialogFooter>
              </Fragment>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
