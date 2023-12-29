import { HeartCrack } from "lucide-react";

export default function UserNotFound() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semi">User not found</p>
    </main>
  );
}
