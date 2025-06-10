import { HeartCrack } from "lucide-react";

export default function UserNotFound() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semibold">Objekt list not found</p>
    </main>
  );
}
