"use client";

import { OwnedObjekt, SearchUser } from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import { Loader2, MailX, Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import { searchForUser } from "@/app/(core)/collection/actions";
import { useState } from "react";
import { Separator } from "../ui/separator";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { useAuthStore } from "@/store";
import { ethers } from "ethers";
import {
  SUPPORTED_ETHEREUM_CHAIN_IDS,
  getRamperSigner,
} from "@ramper/ethereum";
import { Interface, parseEther } from "ethers/lib/utils";
import objektAbi from "@/objekt-abi.json";

type Props = {
  objekt: OwnedObjekt;
};

export default function SendObjekt({ objekt }: Props) {
  return (
    <>
      {!objekt.transferable && <MailX className="h-3 w-3 sm:h-5 sm:w-5" />}
      {objekt.transferable && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                objekt.transferable && "hover:scale-110 transition-all"
              )}
            >
              {objekt.transferable && (
                <Send className="h-3 w-3 sm:h-5 sm:w-5" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <UserSearch objekt={objekt} />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

function UserSearch({ objekt }: { objekt: OwnedObjekt }) {
  const { pending } = useFormStatus();
  const [users, setUsers] = useState<SearchUser[]>([]);

  async function executeSearch(formData: FormData) {
    const results = await searchForUser(formData);
    if (results.success) {
      setUsers(results.users ?? []);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Send Objekt</h4>
      </div>

      <div className="flex flex-col gap-2">
        <form action={executeSearch} className="flex gap-2 items-center">
          <Input name="search" placeholder="Search Cosmo for a user..." />
          <Button variant="default" type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </form>

        {users.length > 0 && <Separator />}
        {users.length > 0 && (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <SendToUserButton
                key={user.address}
                objekt={objekt}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SendToUserButton({
  objekt,
  user,
}: {
  objekt: OwnedObjekt;
  user: SearchUser;
}) {
  const ramperUser = useAuthStore((state) => state.ramperUser);

  async function sendObjekt(toAddress: string) {
    const wallet = ramperUser!.wallets["ethereum"];
    const alchemy = new ethers.providers.AlchemyProvider(
      SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
      "Ohb01kV33OMAtPqRP7Q_jbPyKjZCNS4n"
    );
    const ramperSigner = await getRamperSigner(alchemy);
    const value = ethers.utils.parseEther("0.0");
    const nonce = await alchemy.getTransactionCount(wallet.publicKey);
    const abi = new Interface(objektAbi);
    const customData = abi.encodeFunctionData(abi.getFunction("transferFrom"), [
      wallet.publicKey,
      toAddress,
      objekt.tokenId,
    ]);
    console.log(customData);
    const gasLimit = await alchemy.estimateGas({
      to: objekt.tokenAddress,
      data: customData,
    });
    console.log(gasLimit);
    const feeData = await alchemy.getFeeData();
    console.log(feeData);

    try {
      const result = await ramperSigner.signTransaction({
        type: 2,
        from: wallet.publicKey,
        to: objekt.tokenAddress,
        value: value,
        chainId: SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
        nonce: nonce,
        gasLimit: gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: 60000000000,
        data: customData,
      });
      console.log("signTransaction result", result);

      const sendResult = await alchemy.sendTransaction(result);
      console.log("sendTransaction result", sendResult);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <Button
      variant="ghost"
      className="flex gap-2 items-center"
      onClick={() => sendObjekt(user.address)}
    >
      <Send />
      <span>{user.nickname}</span>
    </Button>
  );
}
