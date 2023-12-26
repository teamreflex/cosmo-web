"use client";

import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "@/components/ui/use-toast";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CopyAddressButton({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast({
      description: "Wallet address copied to clipboard",
    });
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          className="rounded-full"
          variant="secondary"
          size="icon"
          onClick={copyAddress}
        >
          <Copy className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Copy Address</TooltipContent>
    </Tooltip>
  );
}
