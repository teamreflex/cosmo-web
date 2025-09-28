import { Loader2, MailCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteAccount } from "@/hooks/use-account";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const { mutate, status } = useDeleteAccount();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          <Trash2 className="h-4 w-4" />
          <span>Delete Account</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        {status === "success" ? (
          <Success onClose={() => setOpen(false)} />
        ) : (
          <div className="contents">
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This will delete all data associated with your account and
                cannot be undone. You will be sent a verification email to
                confirm deletion.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={status === "pending"}
                onClick={() => mutate()}
              >
                <span>Send Email</span>
                {status === "pending" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Success(props: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <MailCheck className="h-10 w-10" />
      <p className="text-sm font-semibold">
        Click the link in the email to confirm the deletion of your account.
      </p>
      <p className="text-sm text-muted-foreground">
        Your account will not be deleted until the link in the verification
        email is clicked.
      </p>

      <DialogFooter className="mt-4">
        <Button variant="secondary" onClick={props.onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
