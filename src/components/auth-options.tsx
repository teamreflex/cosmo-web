"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { Button } from "./ui/button";
import { useAuthStore } from "@/store";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cosmoLogin, updateSelectedArtist } from "@/app/actions";
import { Check, Disc3, Loader2, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TokenPayload } from "@/lib/server/jwt";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CosmoArtist } from "@/lib/server/cosmo";
import Image from "next/image";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProfileImage from "@/static/profile.webp";

type Props = {
  user: TokenPayload | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
};

export default function AuthOptions({
  user,
  artists,
  selectedArtist,
  comoBalances,
}: Props) {
  const [pending, setPending] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const setRamperUser = useAuthStore((state) => state.setRamperUser);

  const router = useRouter();
  const cosmoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const user = getUser();
    setRamperUser(user);
    setPending(false);

    // TODO: dispatch an action to invalidate the cosmo token here
    if (!user) {
      router.push("/");
    }
  }, [setRamperUser, router]);

  // login with cosmo when the ramper login is complete
  useEffect(() => {
    if (cosmoForm.current && email && token) {
      cosmoForm.current.requestSubmit();
    }
  }, [email, token]);

  async function executeSignIn() {
    setPending(true);
    const result = await signIn();
    if (result.method === "ramper" && result.user) {
      setRamperUser(result.user);

      const token = result.user.ramperCredential?.idToken;
      if (token && cosmoForm.current) {
        setEmail(result.user.email!);
        setToken(token);
      }
    }
  }

  async function executeCosmoLogin(formData: FormData) {
    await cosmoLogin(formData);
    setPending(false);
  }

  async function executeSignOut() {
    signOut();
    setRamperUser(null);
    setPending(false);
  }

  return (
    <>
      <form hidden action={executeCosmoLogin} ref={cosmoForm}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
      </form>

      <div className="flex gap-2 items-center justify-center">
        {user ? (
          <>
            <div className="md:flex gap-2 items-center hidden">
              {comoBalances}
            </div>
            <UserDropdown
              user={user}
              artists={artists}
              selectedArtist={selectedArtist}
              comoBalances={comoBalances}
              onSignOut={executeSignOut}
            />
          </>
        ) : (
          <>
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SignInDialog onClick={executeSignIn} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function SignInDialog({ onClick }: { onClick: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="link">Sign In</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign In</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>You will be redirected to Ramper to sign in.</p>
              <p>
                Make sure to select{" "}
                <span className="font-semibold underline">
                  confirm from a different device
                </span>{" "}
                in the email.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onClick}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type UserDropdownProps = {
  user: TokenPayload;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
  onSignOut: () => void;
};

function UserDropdown({
  user,
  artists,
  selectedArtist,
  comoBalances,
  onSignOut,
}: UserDropdownProps) {
  const [openArtistSwitch, setOpenArtistSwitch] = useState(false);

  return (
    <>
      <SwitchArtistDialog
        open={openArtistSwitch}
        onOpenChange={setOpenArtistSwitch}
        artists={artists}
        selectedArtist={selectedArtist}
      />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarFallback>
              {user.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
            <AvatarImage
              className="bg-cosmo-profile p-[6px]"
              src={ProfileImage.src}
              alt={user.nickname}
            />
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="md:hidden flex gap-2 items-center">
            {comoBalances}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenArtistSwitch(true)}>
            <Disc3 className="mr-2 h-4 w-4" />
            <span>Switch Artist</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSignOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

type SwitchArtistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
};

function SwitchArtistDialog({
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
