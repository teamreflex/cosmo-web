import { CircleAlert } from "lucide-react";

export default function GravityNotFound() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <CircleAlert className="h-24 w-24" />
      <p className="text-sm font-semibold">Gravity not found</p>
    </main>
  );
}
