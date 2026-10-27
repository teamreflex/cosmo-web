import type { ReactNode } from "react";

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
