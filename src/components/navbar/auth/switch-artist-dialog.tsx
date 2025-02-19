import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateSelectedArtist } from "./actions";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

type SwitchArtistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artists: CosmoArtistBFF[];
  selectedArtist: ValidArtist | undefined;
};

export default function SwitchArtistDialog({
  open,
  onOpenChange,
  artists,
  selectedArtist,
}: SwitchArtistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Artist</DialogTitle>
          <DialogDescription>
            Switch the Home tab to the selected artist&apos;s content.
          </DialogDescription>

          <div className="flex flex-col gap-2">
            {artists.map((artist) => (
              <SelectArtistButton
                key={artist.name}
                artist={artist}
                isSelected={artist.name === selectedArtist}
                onOpenChange={onOpenChange}
              />
            ))}
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type SelectArtistButtonProps = {
  artist: CosmoArtistBFF;
  isSelected: boolean;
  onOpenChange: (open: boolean) => void;
};

function SelectArtistButton({
  artist,
  isSelected,
  onOpenChange,
}: SelectArtistButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function select() {
    startTransition(async () => {
      const result = await updateSelectedArtist(artist.id);
      if (result.status === "success") {
        toast({
          description: `Switched to ${artist.title}`,
        });
        router.refresh();
        onOpenChange(false);
      }
      if (result.status === "error") {
        toast({
          variant: "destructive",
          description: result.error,
        });
      }
    });
  }

  return (
    <button
      onClick={select}
      className="flex w-full justify-between items-center px-4 py-2 border border-accent rounded-lg hover:bg-accent/25 transition focus:outline-hidden"
    >
      <div className="flex gap-4 items-center">
        <Image
          className="rounded-full"
          src={artist.logoImageUrl}
          alt={artist.title}
          width={48}
          height={48}
          quality={100}
        />
        <span className="font-bold">{artist.title}</span>
      </div>

      {isPending && <Loader2 className="animate-spin h-5 w-5" />}

      {isSelected && !isPending && (
        <div className="bg-cosmo rounded-full text-white p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}
