"use client";

import { useAuthStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MyPage() {
  const ramperUser = useAuthStore((state) => state.ramperUser);
  const router = useRouter();

  useEffect(() => {
    if (!ramperUser) {
      router.push("/home");
    }
  }, [ramperUser, router]);

  return (
    <main className="flex flex-col items-center p-2">{ramperUser?.email}</main>
  );
}
