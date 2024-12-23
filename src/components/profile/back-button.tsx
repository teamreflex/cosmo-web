"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Undo2 } from "lucide-react";
import { usePathname } from "next/navigation";

type Props = {
  url: string;
};

export default function BackButton({ url }: Props) {
  const pathname = usePathname();

  if (pathname === url) return null;

  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={url}>
        <Undo2 className="h-5 w-5" />
        <span>Back</span>
      </Link>
    </Button>
  );
}
