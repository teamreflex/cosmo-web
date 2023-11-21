import { cn } from "@/lib/utils";
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
  color?: "white" | "black";
};

export default function ApolloLogo({
  className,
  height = 35,
  width = 51,
  color = "white",
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
          className={cn(className, color === "black" && "invert")}
          priority={true}
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.NEXT_PUBLIC_APP_NAME}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is an unofficial platform aiming to
                replicate the Cosmo mobile app with a desktop interface.
              </p>
              <p>
                Some features require signing in to work, which is handled by
                the Cosmo Ramper integration. This requires cookies to function.
              </p>
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is not affiliated with, endorsed by
                or supported by Modhaus or its artists.{" "}
              </p>
              <p className="font-bold">
                Some things may break between Cosmo updates. Use at your own
                risk.
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
