import { cn } from "@/lib/utils";
import Image from "next/image";
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
import { env } from "@/env.mjs";
import CosmoImage from "@/static/cosmo.png";

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
          src={CosmoImage}
          height={height}
          width={width}
          alt="Cosmo"
          className={cn(className, color === "black" && "invert")}
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            cosmo-web v{env.NEXT_PUBLIC_APP_VERSION}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                cosmo-web is a fan-made platform aiming to replicate the Cosmo
                mobile app with a desktop interface.
              </p>
              <p>Not affiliated with Modhaus or its artists.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>👍</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
