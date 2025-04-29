import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { DataSourceSelector } from "@/components/collection/data-source-selector";
import { useAction } from "next-safe-action/hooks";
import { updateSettings } from "./actions";
import { PublicUser } from "@/lib/universal/auth";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
};

export default function SettingsDialog({
  open,
  onOpenChange,
  user,
}: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { execute, isPending } = useAction(updateSettings, {
    onSuccess() {
      toast({
        description: "Settings updated.",
      });
      router.refresh();
      onOpenChange(false);
    },
    onError() {
      toast({
        description: "Error updating settings.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>General Settings</DialogTitle>
          <DialogDescription>
            Adjust any site-wide settings here.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          action={execute}
          id="settings-form"
        >
          {/* theme */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <h2 className="col-span-3 text-sm font-semibold">Theme</h2>
              <p className="col-span-3 col-start-1 row-span-2 text-xs opacity-80">
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
              <SelectContent align="end">
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* grid column size */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <h2 className="col-span-3 text-sm font-semibold">
                Objekt Columns
              </h2>
              <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-xs opacity-80">
                Number of columns to use when displaying objekts.
              </p>
            </div>

            <Select
              name="gridColumns"
              defaultValue={user.gridColumns.toString()}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 Columns</SelectItem>
                <SelectItem value="5">5 Columns</SelectItem>
                <SelectItem value="6">6 Columns</SelectItem>
                <SelectItem value="7">7 Columns</SelectItem>
                <SelectItem value="8">8 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* collection mode */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <h2 className="col-span-3 text-sm font-semibold">
                Collection Mode
              </h2>
              <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-xs opacity-80">
                Mode to use when displaying your own collection.
              </p>
            </div>

            <DataSourceSelector
              name="collectionMode"
              defaultValue={user.collectionMode}
            />
          </div>
        </form>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button form="settings-form" type="submit" disabled={isPending}>
            <span>Save</span>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
