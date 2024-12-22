"use client";

import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "@/components/ui/use-toast";
import { LuClipboardCopy } from "react-icons/lu";
import { Button } from "@/components/ui/button";

export default function CopyAddressButton({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast({
      description: "Wallet address copied to clipboard",
    });
  }

  return (
    <Button
      onClick={copyAddress}
      variant="secondary"
      size="profile"
      data-profile
    >
      <LuClipboardCopy className="h-5 w-5" />
      <span>Copy Address</span>
    </Button>
  );
}
