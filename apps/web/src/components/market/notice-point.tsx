import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

/**
 * A notice dialog's body: its title and description over the points, which
 * scroll when the screen is short, then the footer.
 */
export function NoticeDialogContent({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  /** the NoticePoints */
  children: ReactNode;
}) {
  return (
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-120">
      <AlertDialogHeader className="place-items-start text-left">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="flex flex-col gap-4 overflow-y-auto">{children}</ul>
      {footer}
    </AlertDialogContent>
  );
}

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
};

// one point of a notice dialog: an icon beside a title and its explanation
export default function NoticePoint({
  icon,
  title,
  description,
  children,
}: Props) {
  return (
    <li className="flex items-start gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-4.5">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-pretty text-muted-foreground">{description}</p>
        {children}
      </div>
    </li>
  );
}
