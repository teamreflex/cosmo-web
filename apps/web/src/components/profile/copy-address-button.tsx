import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

export default function CopyAddressButton({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    void copy(address);
    toast.success(m.toast_wallet_address_copied());
  }

  return (
    <Button
      onClick={copyAddress}
      variant="secondary"
      size="profile"
      data-profile
    >
      <IconCopy className="h-5 w-5" />
      <span>{m.profile_address()}</span>
    </Button>
  );
}
