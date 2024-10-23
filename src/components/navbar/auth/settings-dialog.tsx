import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSettings } from "./actions";
import { Button } from "@/components/ui/button";
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
import { useTheme } from "next-themes";
import { toast } from "@/components/ui/use-toast";

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
  const { theme, setTheme } = useTheme();

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
          <DialogDescription>
            Adjust any site-wide settings here.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-2" action={update}>
          {/* theme */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <h2 className="col-span-3 font-semibold">Theme</h2>
              <p className="col-span-3 col-start-1 row-span-2 text-sm opacity-80">
                Theme of the site.
              </p>
            </div>

            <Select
              name="theme"
              defaultValue={theme}
              onValueChange={(value) => setTheme(value)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent
                align="end"
                ref={(ref) => {
                  // fixes mobile touch-through bug in radix
                  if (!ref) return;
                  ref.ontouchstart = (e) => {
                    e.preventDefault();
                  };
                }}
              >
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* grid column size */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <h2 className="col-span-3 font-semibold">Objekt Columns</h2>
              <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
                Number of columns to use when displaying objekts.
              </p>
            </div>

            <Select
              name="gridColumns"
              defaultValue={profile.gridColumns.toString()}
            >
              <SelectTrigger className="w-40">
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

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
