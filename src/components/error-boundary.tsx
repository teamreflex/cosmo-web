import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

export function Error({ message }: { message: string }) {
  function refresh() {
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2 items-center container py-12">
      <HeartCrack className="w-24 h-24" />
      <p className="font-semibold text-sm text-center">{message}</p>

      <Button variant="outline" onClick={refresh}>
        <RefreshCcw className="mr-2" /> Try Again
      </Button>
    </div>
  );
}
