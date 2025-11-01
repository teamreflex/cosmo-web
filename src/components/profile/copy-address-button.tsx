import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

export default function CopyAddressButton({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast.success(m.toast_wallet_address_copied());
  }

  return (
    <Button
      onClick={copyAddress}
      variant="secondary"
      size="profile"
      data-profile
    >
      <Copy className="h-5 w-5" />
      <span>{m.profile_address()}</span>
    </Button>
  );
}
