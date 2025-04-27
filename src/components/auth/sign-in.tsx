import { auth } from "@/lib/server/auth";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import SignInWithDiscord from "./with-discord";
import { headers } from "next/headers";
import SignInWithTwitter from "./with-twitter";

export default async function SignIn() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return <p className="text-xs">{session.user.id}</p>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link">Sign In</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 items-center">
          <SignInWithDiscord />
          <SignInWithTwitter />
        </div>
      </DialogContent>
    </Dialog>
  );
}
