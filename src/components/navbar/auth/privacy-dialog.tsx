import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updatePrivacy } from "./actions";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { PublicProfile } from "@/lib/universal/cosmo/auth";

type PrivacyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PublicProfile;
};

export default function PrivacyDialog({
  open,
  onOpenChange,
  profile,
}: PrivacyDialogProps) {
  const { toast } = useToast();

  async function update(form: FormData) {
    await updatePrivacy(form);
    toast({
      description: "Privacy settings updated.",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy Settings</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-2" action={update}>
          {/* cosmo id/nickname */}
          <div className="grid grid-cols-4 grid-rows-3">
            <h2 className="col-span-3 font-semibold">Cosmo ID</h2>
            <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
              Hides your Cosmo ID when viewing your profile via address.
            </p>
            <div className="row-span-3 col-start-4 row-start-1 flex items-center justify-end">
              <Switch
                name="privacyNickname"
                defaultChecked={profile.privacy.nickname}
              />
            </div>
          </div>

          {/* collection */}
          <div className="grid grid-cols-4 grid-rows-3">
            <h2 className="col-span-3 font-semibold">Collection</h2>
            <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
              Hides your objekt collection and per-member progress.
            </p>
            <div className="row-span-3 col-start-4 row-start-1 flex items-center justify-end">
              <Switch
                name="privacyObjekts"
                defaultChecked={profile.privacy.objekts}
              />
            </div>
          </div>

          {/* como */}
          <div className="grid grid-cols-4 grid-rows-3">
            <h2 className="col-span-3 font-semibold">COMO</h2>
            <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
              Hides your COMO balances and calendar.
            </p>
            <div className="row-span-3 col-start-4 row-start-1 flex items-center justify-end">
              <Switch
                name="privacyComo"
                defaultChecked={profile.privacy.como}
              />
            </div>
          </div>

          {/* trades */}
          <div className="grid grid-cols-4 grid-rows-3">
            <h2 className="col-span-3 font-semibold">Trades</h2>
            <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
              Hides your trades and removes your Cosmo ID from other user&apos;s
              trades.
            </p>
            <div className="row-span-3 col-start-4 row-start-1 flex items-center justify-end">
              <Switch
                name="privacyTrades"
                defaultChecked={profile.privacy.trades}
              />
            </div>
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}
