"use client";

import { OwnedObjekt, SearchUser } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Loader2,
  MailX,
  Search,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import { searchForUser } from "@/app/(core)/collection/actions";
import { useContext, useEffect, useState } from "react";
import { Separator } from "../ui/separator";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { useAuthStore } from "@/store";
import { ethers } from "ethers";
import {
  SUPPORTED_ETHEREUM_CHAIN_IDS,
  getRamperSigner,
} from "@ramper/ethereum";
import { Interface } from "ethers/lib/utils";
import objektAbi from "@/objekt-abi.json";
import { env } from "@/env.mjs";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Objekt from "./objekt";
import { RefetchObjektsContext } from "./objekt-list";

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
  COMPLETE = 8,
}

export default function SendObjekt({ objekt }: Props) {
  const [openSearch, setOpenSearch] = useState(false);
  const [openSend, setOpenSend] = useState(false);
  const [recipient, setRecipient] = useState<SearchUser | null>(null);
  const [transactionProgress, setTransactionProgress] =
    useState<TransactionStatus>(TransactionStatus.WAITING);
  const [percentage, setPercentage] = useState(0);

  const refetchPage = useContext(RefetchObjektsContext);

  // calculate progress
  useEffect(() => {
    setPercentage(
      Math.round((transactionProgress / TransactionStatus.COMPLETE) * 100) || 0
    );

    if (transactionProgress === TransactionStatus.COMPLETE) {
      refetchPage();
    }
  }, [transactionProgress, setPercentage, refetchPage]);

  function prepareSending(newRecipient: SearchUser) {
    setRecipient(newRecipient);
    setOpenSearch(false);
    setOpenSend(true);
  }

  return (
    <>
      {!objekt.transferable && (
        <MailX className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
      )}
      {objekt.transferable && (
        <Dialog open={openSearch} onOpenChange={setOpenSearch}>
          <DialogTrigger asChild>
            <button
              onClick={() => setOpenSearch(true)}
              className={cn(
                objekt.transferable && "hover:scale-110 transition-all"
              )}
            >
              {objekt.transferable && (
                <Send className="h-3 w-3 sm:h-5 sm:w-5" />
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Send Objekt</DialogTitle>
              <DialogDescription>
                Search for another Cosmo user to send the objekt to.
              </DialogDescription>
            </DialogHeader>

            <div className="flex">
              <UserSearch onRecipientSelected={prepareSending} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {recipient && (
        <Dialog open={openSend} onOpenChange={setOpenSend}>
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

            {/* show complete state */}
            {transactionProgress === TransactionStatus.COMPLETE && (
              <div className="flex flex-col gap-2 justify-center items-center">
                <Check className="h-10 w-10" />
                <p className="text-sm">Objekt sent to {recipient.nickname}</p>
              </div>
            )}

            {/* progress bar while sending */}
            {transactionProgress !== TransactionStatus.WAITING &&
              transactionProgress !== TransactionStatus.COMPLETE &&
              transactionProgress !== TransactionStatus.ERROR && (
                <div className="w-full bg-accent h-2 shadow-sm rounded">
                  <div
                    className="bg-foreground h-2 rounded transition-all animate-pulse"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}

            {/* show preview before sending */}
            {transactionProgress === TransactionStatus.WAITING && (
              <div className="flex flex-col gap-4 justify-center items-center">
                <Objekt
                  objekt={objekt}
                  showButtons={false}
                  lockedObjekts={[]}
                />
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
                  updateTransactionProgress={setTransactionProgress}
                />
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

const instagrams = [
  "0ct0ber19",
  "withaseul",
  "kimxxlip",
  "zindoriyam",
  "cher_ryppo",
];

function UserSearchButton() {
  const { pending } = useFormStatus();

  return (
    <Button variant="default" type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Search />}
    </Button>
  );
}

type UserSearchProps = {
  onRecipientSelected: (recipient: SearchUser) => void;
};

function UserSearch({ onRecipientSelected }: UserSearchProps) {
  const [users, setUsers] = useState<SearchUser[]>([]);

  const placeholder = instagrams[Math.floor(Math.random() * (1 + 4 - 0)) + 0];

  async function executeSearch(formData: FormData) {
    const results = await searchForUser(formData);
    if (results.success) {
      setUsers(results.users ?? []);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <form action={executeSearch} className="flex gap-2 items-center">
        <Input name="search" placeholder={`${placeholder}...`} />
        <UserSearchButton />
      </form>

      {users.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <Button
                key={user.address}
                variant="ghost"
                className="flex gap-2 items-center"
                onClick={() => onRecipientSelected(user)}
              >
                <Send />
                <span>{user.nickname}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type SendToUserButtonProps = {
  objekt: OwnedObjekt;
  user: SearchUser;
  updateTransactionProgress: (status: TransactionStatus) => void;
};

function SendToUserButton({
  objekt,
  user,
  updateTransactionProgress,
}: SendToUserButtonProps) {
  const { toast } = useToast();
  const ramperUser = useAuthStore((state) => state.ramperUser);

  async function fetchNonce(
    alchemy: ethers.providers.AlchemyProvider,
    address: string
  ) {
    try {
      return await alchemy.getTransactionCount(address);
    } catch (_) {
      throw new TransactionError("Failed to get transaction count");
    }
  }

  function encodeTransaction(
    fromAddress: string,
    toAddress: string,
    tokenId: string
  ) {
    try {
      const abi = new Interface(objektAbi);
      return abi.encodeFunctionData(abi.getFunction("transferFrom"), [
        fromAddress,
        toAddress,
        tokenId,
      ]);
    } catch (_) {
      throw new TransactionError("Failed to encode transaction");
    }
  }

  async function fetchGasLimit(
    alchemy: ethers.providers.AlchemyProvider,
    objektContract: string,
    transactionData: string
  ) {
    try {
      return await alchemy.estimateGas({
        to: objektContract,
        data: transactionData,
      });
    } catch (_) {
      throw new TransactionError("Failed to fetch gas limit");
    }
  }

  async function fetchFeeData(alchemy: ethers.providers.AlchemyProvider) {
    try {
      return await alchemy.getFeeData();
    } catch (_) {
      throw new TransactionError("Failed to fetch transaction fee data");
    }
  }

  async function signTransaction(
    ramperSigner: any,
    fromAddress: string,
    value: ethers.BigNumber,
    nonce: number,
    gasLimit: ethers.BigNumber,
    maxFeePerGas: ethers.BigNumber | null,
    customData: string
  ) {
    try {
      return await ramperSigner.signTransaction({
        type: 2,
        from: fromAddress,
        to: objekt.tokenAddress,
        value,
        chainId: SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
        nonce,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas: 60000000000,
        data: customData,
      });
    } catch (_) {
      throw new TransactionError("Failed to sign transaction");
    }
  }

  async function sendTransaction(
    alchemy: ethers.providers.AlchemyProvider,
    signedTransaction: string
  ) {
    try {
      return await alchemy.sendTransaction(signedTransaction);
    } catch (_) {
      throw new TransactionError("Failed to send transaction");
    }
  }

  async function sendObjekt() {
    setPending(true);
    const wallet = ramperUser!.wallets["ethereum"];
    const alchemy = new ethers.providers.AlchemyProvider(
      SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
      env.NEXT_PUBLIC_ALCHEMY_KEY
    );

    try {
      const ramperSigner = await getRamperSigner(alchemy);
      updateTransactionProgress(TransactionStatus.GET_USER);
      const value = ethers.utils.parseEther("0.0");
      const nonce = await fetchNonce(alchemy, wallet.publicKey);
      updateTransactionProgress(TransactionStatus.GET_NONCE);
      const customData = encodeTransaction(
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
      const feeData = await fetchFeeData(alchemy);
      updateTransactionProgress(TransactionStatus.GET_FEE_DATA);

      // get confirmation from user
      const signResult = await signTransaction(
        ramperSigner,
        wallet.publicKey,
        value,
        nonce,
        gasLimit,
        feeData.maxFeePerGas,
        customData
      );
      updateTransactionProgress(TransactionStatus.SIGN_TRANSACTION);

      await sendTransaction(alchemy, signResult);
      updateTransactionProgress(TransactionStatus.SEND_TRANSACTION);

      toast({
        description: "Transaction submitted!",
        variant: "default",
      });
      updateTransactionProgress(TransactionStatus.COMPLETE);
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
class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionError";
  }
}
