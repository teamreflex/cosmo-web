import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Loader2 } from "lucide-react";
import Image from "next/image";
import CosmoImage from "@/assets/cosmo.webp";
import PolygonImage from "@/assets/polygon.svg";

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

  function save(form: FormData) {
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

        <form className="flex flex-col gap-4" action={save} id="settings-form">
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
              <SelectContent align="end">
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
              <h2 className="col-span-3 font-semibold">Collection Mode</h2>
              <p className="col-span-3 col-start-1 row-start-2 row-span-3 text-sm opacity-80">
                Mode to use when displaying your own collection.
              </p>
            </div>

            <Select name="dataSource" defaultValue={profile.dataSource}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Data Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cosmo">
                  <div className="flex flex-row items-center gap-2">
                    <Image
                      src={CosmoImage.src}
                      alt="COSMO"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <span>Cosmo</span>
                  </div>
                </SelectItem>
                {/* <SelectItem value="cosmo-legacy">
                  <div className="flex flex-row items-center gap-2">
                    <Image
                      src={CosmoImage.src}
                      alt="COSMO"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <span>Legacy</span>
                  </div>
                </SelectItem> */}
                <SelectItem value="blockchain">
                  <div className="flex flex-row items-center gap-2">
                    <div className="relative bg-polygon h-6 w-6 rounded-full">
                      <Image
                        src={PolygonImage.src}
                        alt="Polygon"
                        fill={true}
                        className="p-1"
                      />
                    </div>
                    <span>Polygon</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button form="settings-form" type="submit" disabled={isPending}>
            <span>Save</span>
            {isPending && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
