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
          alt="Cosmo"
          className={cn(className, color === "black" && "invert")}
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            cosmo-web v{env.NEXT_PUBLIC_APP_VERSION}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Not affiliated with Modhaus
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Ok</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
