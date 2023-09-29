import { Loader2 } from "lucide-react";

export function LoadingNews() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <Loader2 className="animate-spin w-24 h-24" />
      <p className="font-semibold text-sm text-center">Loading news...</p>
    </div>
  );
}
