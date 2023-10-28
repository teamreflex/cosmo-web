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

type Props = {
  className?: string;
  height?: number;
  width?: number;
  color?: "white" | "black";
};

export default function CosmoLogo({
  className,
  height = 35,
  width = 35,
  color = "white",
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Image
          src="/cosmo.png"
          height={height}
          width={width}
          quality={100}
          alt="Cosmo"
          className={cn(className, color === "black" && "invert")}
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {env.NEXT_PUBLIC_APP_NAME} v{env.NEXT_PUBLIC_APP_VERSION}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is a fan-made platform aiming to
                replicate the Cosmo mobile app with a desktop interface.
              </p>
              <p>
                It is not affiliated with Modhaus or its artists and is not
                endorsed by its developers.
              </p>
              <p>
                There will be instances where certain features are not perfectly
                replicated 1:1 with the mobile app, and cannot guarantee perfect
                functionality despite best efforts.
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
