"use client";

import { UserContext } from "@/context/user";
import { useContext } from "react";

export default function Home() {
  const user = useContext(UserContext);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {user!.nickname}
    </main>
  );
}
