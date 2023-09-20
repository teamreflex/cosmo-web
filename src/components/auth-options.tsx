"use client";

import { getUser, signIn, signOut } from "@ramper/ethereum";
import { Button } from "./ui/button";
import { useAuthStore } from "@/store";
import { useEffect } from "react";

export default function AuthOptions() {
  const ramperUser = useAuthStore((state) => state.ramperUser);
  const setRamperUser = useAuthStore((state) => state.setRamperUser);

  useEffect(() => {
    setRamperUser(getUser());
  }, [setRamperUser]);

  async function executeSignIn() {
    const result = await signIn();
    if (result.method === "ramper" && result.user) {
      setRamperUser(result.user);
    }
  }

  return (
    <>
      {ramperUser ? (
        <Button variant="link" onClick={signOut}>
          Sign Out
        </Button>
      ) : (
        <Button variant="link" onClick={() => executeSignIn()}>
          Sign In
        </Button>
      )}
    </>
  );
}
