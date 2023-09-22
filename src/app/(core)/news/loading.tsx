import { Loader2 } from "lucide-react";

export default async function NewsLoading() {
  return (
    <main className="flex flex-col items-center py-12">
      <Loader2 className="animate-spin h-24 w-24" />
    </main>
  );
}
