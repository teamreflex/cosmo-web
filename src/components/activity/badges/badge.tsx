"use client";

import { CosmoActivityBadge } from "@/lib/universal/cosmo/activity/badges";
import Image from "next/image";
import VisuallyHidden from "@/components/ui/visually-hidden";
import { format } from "date-fns";
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

type Props = {
  badge: CosmoActivityBadge;
};

export default function Badge({ badge }: Props) {
  const receivedAt = new Date(badge.grantedAt);
  const formattedDetail = format(receivedAt, "MMMM do, yyyy");
  const formattedShort = format(receivedAt, "yyyy.MM.dd");

  return (
    <div className="flex flex-col gap-2 items-center justify-center w-full">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="relative w-full aspect-square cursor-pointer">
            <Image src={badge.image} fill={true} alt={badge.title} />
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <VisuallyHidden>
            <AlertDialogHeader>
              <AlertDialogTitle>{badge.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {badge.badgeCategory} - {badge.season}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </VisuallyHidden>

          <div className="flex flex-col gap-2 items-center justify-center">
            <div className="relative h-40 aspect-square">
              <Image src={badge.image} fill={true} alt={badge.title} />
            </div>

            <h3 className="text-lg font-semibold">{badge.title}</h3>
            <p className="text-sm text-muted-foreground">
              {badge.badgeCategory} · {badge.season}
            </p>

            <p className="text-sm font-semibold">Received: {formattedDetail}</p>
          </div>

          <AlertDialogFooter className="justify-self-center">
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col items-center justify-center w-full">
        <p className="text-sm font-semibold truncate w-full text-center">
          {badge.title}
        </p>
        <p className="text-xs text-muted-foreground">{formattedShort}</p>
      </div>
    </div>
  );
}
