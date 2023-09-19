"use client";

import { UserContext } from "@/context/user";
import { useContext } from "react";

export default function HomePage() {
  const user = useContext(UserContext);

  return (
    <main className="flex flex-col items-center p-2">{user!.nickname}</main>
  );
}
