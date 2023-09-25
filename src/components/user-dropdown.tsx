"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { Button } from "./ui/button";
import { useAuthStore, useSettingsStore } from "@/store";
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
import { cosmoLogin } from "@/app/(auth)/login/email/actions";
import { Disc3, Loader2, LogOut, Moon, Sparkle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TokenPayload } from "@/lib/server/jwt";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CosmoArtist, CosmoUser } from "@/lib/server/cosmo";
import Image from "next/image";
import { ValidArtist } from "@/lib/server/cosmo/common";

type Props = {
  user: TokenPayload | undefined;
  cosmoUser: CosmoUser | undefined;
  artists: CosmoArtist[];
};

export default function UserDropdown({ user, artists, cosmoUser }: Props) {
  const [pending, setPending] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const ramperUser = useAuthStore((state) => state.ramperUser);
  const setRamperUser = useAuthStore((state) => state.setRamperUser);
  const setArtist = useSettingsStore((state) => state.setArtist);
  const setAvailableArtists = useSettingsStore(
    (state) => state.setAvailableArtists
  );

  const router = useRouter();
  const cosmoForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setAvailableArtists(artists);
  }, [artists]);

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
        {user && cosmoUser ? (
          <>
            <div className="md:flex gap-2 items-center hidden">
              {cosmoUser.artists.map((artist) => (
                <ComoBalance key={artist.name} artist={artist} />
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar>
                  <AvatarFallback>
                    {user?.nickname?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="md:hidden flex gap-2 items-center">
                  {cosmoUser.artists.map((artist) => (
                    <ComoBalance key={artist.name} artist={artist} />
                  ))}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Disc3 className="mr-2 h-4 w-4" />
                    <span>Switch Artist</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {artists.map((artist) => (
                        <DropdownMenuItem
                          key={artist.name}
                          onClick={() => setArtist(artist.name as ValidArtist)}
                        >
                          <Image
                            className="mr-2 rounded-full"
                            src={artist.logoImageUrl}
                            alt={artist.title}
                            width={24}
                            height={24}
                          />
                          <span>{artist.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={executeSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link">Sign In</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign In</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
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
                    <AlertDialogAction onClick={() => executeSignIn()}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </>
  );
}

const map: Record<ValidArtist, ReactNode> = {
  artms: (
    <Moon className="ring-1 p-px w-3 h-3 rounded-full text-teal-400 fill-teal-400 ring-teal-400" />
  ),
  tripleS: (
    <Sparkle className="ring-1 p-px w-3 h-3 rounded-full text-purple-300 fill-purple-300 ring-purple-300" />
  ),
};

function ComoBalance({ artist }: { artist: CosmoUser["artists"][number] }) {
  return (
    <div className="flex justify-between items-center rounded bg-accent border border-black/30 dark:border-white/30 h-6 w-16 px-1 shadow">
      {map[artist.name as ValidArtist]}
      <span className="text-sm">{artist.assetBalance.totalComo}</span>
    </div>
  );
}
