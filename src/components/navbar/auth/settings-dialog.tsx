import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSettings } from "./actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PublicProfile;
};

export default function SettingsDialog({
  open,
  onOpenChange,
  profile,
}: SettingsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function update(form: FormData) {
    startTransition(async () => {
      const result = await updateSettings(form);
      if (result.status === "success") {
        toast({
          description: "Settings updated.",
        });
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>General Settings</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-2" action={update}>
          {/* grid column size */}
          <div className="grid grid-cols-4 grid-rows-3">
            <h2 className="col-span-3 font-semibold">Objekt Columns</h2>
            <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
              Number of columns to use when displaying objekts.
            </p>
            <div className="row-span-3 col-start-4 row-start-1 flex items-center justify-end">
              <Select
                name="gridColumns"
                defaultValue={profile.gridColumns.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Columns" />
                </SelectTrigger>
                <SelectContent
                  ref={(ref) => {
                    // fixes mobile touch-through bug in radix
                    if (!ref) return;
                    ref.ontouchstart = (e) => {
                      e.preventDefault();
                    };
                  }}
                >
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="5">5 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                  <SelectItem value="7">7 Columns</SelectItem>
                  <SelectItem value="8">8 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
