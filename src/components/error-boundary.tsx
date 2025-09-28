import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

export function Error({ message }: { message: string }) {
  function refresh() {
    window.location.reload();
  }

  return (
    <div className="container flex flex-col items-center gap-2 py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-center text-sm font-semibold">{message}</p>

      <Button variant="outline" onClick={refresh}>
        <RefreshCcw className="mr-2" /> Try Again
      </Button>
    </div>
  );
}
