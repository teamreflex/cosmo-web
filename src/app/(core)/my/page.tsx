"use client";

import { useAuthStore } from "@/store";

export default function MyPage() {
  const ramperUser = useAuthStore((state) => state.ramperUser);

  return (
    <main className="flex flex-col items-center p-2">{ramperUser?.email}</main>
  );
}
