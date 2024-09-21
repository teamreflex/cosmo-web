import Image from "next/image";
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
import { env } from "@/env.mjs";
import Link from "next/link";
import { Check, Github } from "lucide-react";
import LogoImage from "@/assets/logo.png";

type Props = {
  className?: string;
  height?: number;
  width?: number;
};

export default function ApolloLogo({
  className,
  height = 35,
  width = 51,
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Image
          src={LogoImage.src}
          height={height}
          width={width}
          quality={100}
          alt={env.NEXT_PUBLIC_APP_NAME}
          className="invert dark:invert-0"
          priority={true}
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.NEXT_PUBLIC_APP_NAME}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is an unofficial desktop client for{" "}
                <span className="italic">Cosmo: the Gate</span>.
              </p>
              <p>Source code can be found below.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel asChild>
            <Link
              href="https://github.com/teamreflex/cosmo-web"
              target="_blank"
            >
              <Github />
            </Link>
          </AlertDialogCancel>
          <AlertDialogAction>
            <Check />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
