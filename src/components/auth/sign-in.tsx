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
import VisuallyHidden from "../ui/visually-hidden";
import SignInWithDiscord from "./with-discord";
import { headers } from "next/headers";

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
        <Button variant="link">Sign in</Button>
      </DialogTrigger>
      <DialogContent>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>
              Sign in to your account to continue
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <div className="flex flex-col gap-2">
          <SignInWithDiscord />
        </div>
      </DialogContent>
    </Dialog>
  );
}
