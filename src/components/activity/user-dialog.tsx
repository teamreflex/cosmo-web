import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TokenPayload } from "@/lib/universal/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Image from "next/image";
import ProfileImage from "@/assets/profile.webp";
import { PropsWithClassName, cn } from "@/lib/utils";
import CopyWallet from "./copy-wallet";

type Props = {
  user: TokenPayload;
};

export default function UserDialog({ user }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button aria-label="View user">
          <UserImage user={user} className="h-10 w-10" padding="p-2" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex flex-col gap-2 items-center py-3">
          <UserImage user={user} />
          <p className="font-bold text-xl">{user!.nickname}</p>
          <CopyWallet address={user.address} />
        </div>

        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type UserImageProps = PropsWithClassName<{
  user: TokenPayload;
  padding?: string;
}>;

function UserImage({ className, user, padding }: UserImageProps) {
  return (
    <Avatar className={cn("h-36 w-36", className)}>
      <AvatarFallback className="relative bg-cosmo-profile">
        <Image
          className={cn("p-6", padding)}
          src={ProfileImage.src}
          fill={true}
          alt={user.nickname}
        />
      </AvatarFallback>
      <AvatarImage src="" alt={user.nickname} />
    </Avatar>
  );
}
