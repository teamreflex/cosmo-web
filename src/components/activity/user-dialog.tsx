import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import ProfileImage from "@/assets/profile.webp";
import { PropsWithClassName, cn } from "@/lib/utils";
import CopyWallet from "./copy-wallet";
import { CosmoUser } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { TokenPayload } from "@/lib/universal/auth";
import { getCosmoUser } from "@/app/data-fetching";
import AuthFallback from "../navbar/auth-fallback";
import VisuallyHidden from "../ui/visually-hidden";

type Props = {
  artist: ValidArtist;
  token: TokenPayload;
};

export default async function UserDialog({ token, artist }: Props) {
  try {
    var cosmoUser = await getCosmoUser(token.accessToken);
  } catch (err) {
    return <AuthFallback />;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button aria-label="View user" className="outline-hidden">
          <UserImage
            user={cosmoUser}
            artist={artist}
            className="h-10 w-10"
            padding="p-2"
          />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <VisuallyHidden>
          <AlertDialogHeader>
            <AlertDialogTitle>{cosmoUser.nickname}</AlertDialogTitle>
            <AlertDialogDescription>
              Copy your wallet address
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>
        <div className="flex flex-col gap-2 items-center py-3">
          <UserImage user={cosmoUser} artist={artist} />
          <p className="font-bold text-xl">{cosmoUser.nickname}</p>
          <CopyWallet address={cosmoUser.address} />
        </div>

        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type UserImageProps = PropsWithClassName<{
  user: CosmoUser;
  artist: ValidArtist;
  padding?: string;
}>;

function UserImage({ className, user, artist, padding }: UserImageProps) {
  const profile = user.profile.find(
    (p) => p.artistName.toLowerCase() === artist.toLowerCase()
  );

  return (
    <Avatar className={cn("h-36 w-36", className)}>
      <AvatarFallback>{user.nickname.charAt(0).toUpperCase()}</AvatarFallback>

      {profile !== undefined ? (
        <AvatarImage src={profile.image.original} alt={user.nickname} />
      ) : (
        <AvatarImage
          className={cn("bg-cosmo-profile p-6", padding)}
          src={ProfileImage.src}
          alt={user.nickname}
        />
      )}
    </Avatar>
  );
}
