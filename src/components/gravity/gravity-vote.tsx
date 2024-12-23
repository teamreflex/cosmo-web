"use client";

import {
  CosmoPollChoices,
  PollViewDefaultContent,
  PollViewSelectedContent,
} from "@/lib/universal/cosmo/gravity";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { MutationStatus } from "@tanstack/react-query";
import { startTransition, useState } from "react";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { toast } from "../ui/use-toast";
import { ChoiceRenderer, DefaultContent } from "./gravity-choices";
import { useGravityVote } from "@/hooks/use-wallet-transaction";
import {
  CheckCircle,
  ExternalLink,
  Satellite,
  TriangleAlert,
} from "lucide-react";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { Hex } from "viem";
import { cn } from "@/lib/utils";
import { useComo } from "@/hooks/use-como";
import { match } from "ts-pattern";

type State = "select" | "confirm" | "send";

type VoteDialogProps = {
  artist: CosmoArtist;
  poll: CosmoPollChoices;
};

export default function VoteDialog({ artist, poll }: VoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("select");
  const [selected, setSelected] = useState<
    PollViewSelectedContent | undefined
  >();
  const [amount, setAmount] = useState<number | undefined>();
  const { send, status, hash } = useGravityVote();
  const { como } = useComo();

  // TODO: implement combination polls
  if (poll.type === "combination-poll") return null;

  function onCancel() {
    startTransition(() => {
      setOpen(false);
      setState("select");
      setSelected(undefined);
      setAmount(undefined);
    });
  }

  function onSelection() {
    setState("confirm");
  }

  function onConfirm() {
    if (!selected) {
      toast({
        variant: "destructive",
        description: "Please enter a valid choice",
      });
      return;
    }

    if (!amount || amount === 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount",
      });
      return;
    }

    if (amount > como) {
      toast({
        variant: "destructive",
        description: `You only have ${como} COMO`,
      });
      return;
    }

    send({
      artist: poll.artist,
      governorContract: artist.contracts.Governor,
      comoContract: artist.contracts.Como,
      pollId: poll.id,
      comoAmount: amount,
      choiceId: selected.choiceId,
    });

    setState("send");
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="cosmo">Vote</Button>
      </DrawerTrigger>

      <DrawerContent className="w-full md:w-96 md:mx-auto gap-2">
        <DrawerHeader>
          <DrawerTitle>Vote</DrawerTitle>
          <DrawerDescription>{poll.title}</DrawerDescription>
        </DrawerHeader>

        {state === "select" ? (
          <ChoiceSelection
            defaultContent={poll.pollViewMetadata.defaultContent}
            choices={poll.pollViewMetadata.selectedContent}
            selected={selected}
            setSelected={setSelected}
            amount={amount}
            setAmount={setAmount}
            onCancel={onCancel}
            onSelection={onSelection}
            maxComo={como}
          />
        ) : state === "confirm" ? (
          <ChoiceConfirmation
            selected={selected!}
            amount={amount!}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : (
          state === "send" && (
            <ChoiceSend
              selected={selected!}
              amount={amount!}
              status={status}
              hash={hash}
              onClose={onCancel}
            />
          )
        )}
      </DrawerContent>
    </Drawer>
  );
}

type ChoiceSelectionProps = {
  defaultContent: PollViewDefaultContent;
  choices: PollViewSelectedContent[];
  selected?: PollViewSelectedContent;
  setSelected: (choice: PollViewSelectedContent) => void;
  amount?: number;
  setAmount: (amount: number) => void;
  onCancel: () => void;
  onSelection: () => void;
  maxComo: number;
};

function ChoiceSelection({
  defaultContent,
  choices,
  selected,
  setSelected,
  amount,
  setAmount,
  onCancel,
  onSelection,
  maxComo,
}: ChoiceSelectionProps) {
  const isDisabled =
    selected === undefined ||
    amount === undefined ||
    amount === 0 ||
    amount > maxComo;

  return (
    <div className="flex flex-col gap-2">
      {selected === undefined ? (
        <DefaultContent content={defaultContent} />
      ) : (
        <ChoiceRenderer choice={selected} />
      )}

      <div className="flex px-2">
        <Input
          name="comoAmount"
          type="number"
          min={1}
          step={1}
          placeholder="Select COMO amount..."
          onChange={(e) => setAmount(parseInt(e.target.value))}
        />
      </div>

      <ScrollArea className="flex flex-col min-h-24 max-h-72 p-2">
        {choices.map((choice) => (
          <button
            key={choice.choiceId}
            onClick={() => setSelected(choice)}
            className={cn(
              "flex gap-4 items-center rounded-lg border border-accent transition-colors w-full p-3 my-2",
              selected !== undefined &&
                choice?.choiceId === selected?.choiceId &&
                "border-cosmo"
            )}
          >
            <div className="relative aspect-square rounded-lg h-12 bg-black overflow-hidden">
              <Image
                src={choice.content.imageUrl}
                alt={choice.content.title}
                fill={true}
              />
            </div>

            <div className="flex flex-col justify-between items-start text-start">
              <h3 className="font-bold">{choice.content.title}</h3>
              <p className="text-white/75 text-xs">
                {choice.content.description}
              </p>
            </div>
          </button>
        ))}
      </ScrollArea>

      <DrawerFooter className="flex flex-row justify-center items-center gap-2">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>

        <Button onClick={onSelection} disabled={isDisabled}>
          Select
        </Button>
      </DrawerFooter>
    </div>
  );
}

type ChoiceConfirmationProps = {
  selected: PollViewSelectedContent;
  amount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

function ChoiceConfirmation({
  selected,
  amount,
  onCancel,
  onConfirm,
}: ChoiceConfirmationProps) {
  return (
    <div className="flex flex-col gap-2 px-2">
      <ChoiceRenderer choice={selected} />

      <p className="text-sm text-center">
        Are you sure you want to use {amount} COMO to vote for{" "}
        {selected.content.title}?
      </p>

      <DrawerFooter className="flex flex-row justify-center items-center gap-2">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>

        <Button onClick={onConfirm}>Confirm</Button>
      </DrawerFooter>
    </div>
  );
}

type ChoiceSendProps = {
  selected: PollViewSelectedContent;
  amount: number;
  status: MutationStatus;
  hash: Hex | undefined;
  onClose: () => void;
};

function ChoiceSend({
  selected,
  amount,
  status,
  hash,
  onClose,
}: ChoiceSendProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {match(status)
        .with("idle", () => <p className="text-sm font-semibold">Waiting...</p>)
        .with("pending", () => (
          <div className="contents">
            <Satellite className="h-10 w-10 animate-pulse" />
            <p className="text-sm font-semibold">Sending transaction...</p>
          </div>
        ))
        .with("error", () => (
          <div className="contents">
            <TriangleAlert className="h-10 w-10" />
            <p className="text-sm font-semibold">Error sending transaction</p>
          </div>
        ))
        .with("success", () => (
          <div className="contents">
            <CheckCircle className="h-10 w-10" />
            <p className="text-sm font-semibold">
              {amount} COMO sent for {selected.content.title}!
            </p>
            <a
              className="text-sm underline flex items-center gap-1"
              href={`https://polygonscan.com/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>View on PolygonScan</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))
        .exhaustive()}

      <DrawerFooter className="flex flex-row justify-center items-center gap-2">
        {status !== "pending" && (
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        )}
      </DrawerFooter>
    </div>
  );
}
