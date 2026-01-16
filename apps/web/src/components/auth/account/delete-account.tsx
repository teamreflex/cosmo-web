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
import { m } from "@/i18n/messages";
import { IconLoader2, IconMailCheck, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const { mutate, status } = useDeleteAccount();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          <IconTrash className="h-4 w-4" />
          <span>{m.delete_account_title()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        {status === "success" ? (
          <Success onClose={() => setOpen(false)} />
        ) : (
          <div className="contents">
            <DialogHeader>
              <DialogTitle>{m.delete_account_confirm_title()}</DialogTitle>
              <DialogDescription>
                {m.delete_account_confirm_description()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {m.common_cancel()}
              </Button>
              <Button
                variant="destructive"
                disabled={status === "pending"}
                onClick={() => mutate()}
              >
                <span>{m.delete_account_send_email()}</span>
                {status === "pending" && (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
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
      <IconMailCheck className="h-10 w-10" />
      <p className="text-sm font-semibold">
        {m.delete_account_success_title()}
      </p>
      <p className="text-sm text-muted-foreground">
        {m.delete_account_success_description()}
      </p>

      <DialogFooter className="mt-4">
        <Button variant="secondary" onClick={props.onClose}>
          {m.common_close()}
        </Button>
      </DialogFooter>
    </div>
  );
}
