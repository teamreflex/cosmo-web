import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export default function CopyAddressButton({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast({
      description: "Wallet address copied to clipboard",
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={copyAddress}>
      <Copy className="mr-2 h-5 w-5" /> {address.substring(0, 8) + "..."}
    </Button>
  );
}