import { CosmoArtist, ValidArtist } from "@/lib/server/cosmo";
import { useEffect, useRef, useState } from "react";
import { updateSelectedArtist } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";

type SwitchArtistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
};

export default function SwitchArtistDialog({
  open,
  onOpenChange,
  artists,
  selectedArtist,
}: SwitchArtistDialogProps) {
  const [selectedArtistLocal, setSelectedArtist] = useState<
    ValidArtist | undefined
  >(selectedArtist);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (form.current) {
      form.current.requestSubmit();
    }
  }, [selectedArtist]);

  async function executeArtistUpdate(form: FormData) {
    await updateSelectedArtist(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Artist</DialogTitle>
          <DialogDescription>
            Switch the Home tab to the selected artist&apos;s content.
          </DialogDescription>

          <form action={executeArtistUpdate} ref={form}>
            <input
              hidden
              name="artist"
              value={selectedArtistLocal as string}
              readOnly
            />

            <div className="flex flex-col gap-2">
              {artists.map((artist) => (
                <SelectArtistButton
                  key={artist.name}
                  artist={artist}
                  updateArtist={() =>
                    setSelectedArtist(artist.name as ValidArtist)
                  }
                  isSelected={artist.name === selectedArtistLocal}
                />
              ))}
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type SelectArtistButtonProps = {
  artist: CosmoArtist;
  updateArtist: (artist: CosmoArtist) => void;
  isSelected: boolean;
};

function SelectArtistButton({
  artist,
  updateArtist,
  isSelected,
}: SelectArtistButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      onClick={() => updateArtist(artist)}
      className="flex w-full justify-between items-center px-4 py-2 border border-accent rounded-lg hover:bg-accent/25 transition focus:outline-none"
    >
      <div className="flex gap-4 items-center">
        <Image
          className="rounded-full"
          src={artist.logoImageUrl}
          alt={artist.title}
          width={48}
          height={48}
        />
        <span className="font-bold">{artist.title}</span>
      </div>

      {isSelected && pending && <Loader2 className="animate-spin h-5 w-5" />}

      {isSelected && !pending && (
        <div className="bg-cosmo rounded-full text-white p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}
