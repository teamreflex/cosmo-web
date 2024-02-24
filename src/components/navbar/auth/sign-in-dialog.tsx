import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/use-countdown";
import { LogIn } from "lucide-react";

export default function SignInDialog({ onClick }: { onClick: () => void }) {
  const { open, setOpen, count } = useCooldown();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="link">
          <span className="hidden md:block">Sign In</span>
          <LogIn className="md:hidden h-8 w-8 shrink-0" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign In</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>You will be redirected to Ramper to sign in.</p>
              <p className="text-lg">
                Make sure to select{" "}
                <span className="font-semibold underline text-red-500">
                  confirm from a different device
                </span>{" "}
                in the email.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onClick} disabled={count > 0}>
            {count > 0 ? `Continue (${count})` : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
