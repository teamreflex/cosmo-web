"use client";

import { Copy } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "../ui/use-toast";

type Props = {
  address: string;
};

export default function CopyWallet({ address }: Props) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast({
      description: "Wallet address copied to clipboard",
    });
  }

  return (
    <button className="flex gap-1 items-center" onClick={() => copyAddress()}>
      <Copy className="w-4 h-4" />
      <span className="underline">Copy your wallet address</span>
    </button>
  );
}
