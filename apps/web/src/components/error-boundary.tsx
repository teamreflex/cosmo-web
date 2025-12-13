import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import { Button } from "./ui/button";
import { m } from "@/i18n/messages";

export function Error({ message }: { message: string }) {
  function refresh() {
    window.location.reload();
  }

  return (
    <div className="container flex flex-col items-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-center text-sm font-semibold">{message}</p>

      <Button variant="outline" onClick={refresh}>
        <IconRefresh className="mr-2" /> {m.error_try_again()}
      </Button>
    </div>
  );
}
