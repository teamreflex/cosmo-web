import { env } from "@/env";
import { CircleAlert } from "lucide-react";

export default function UserNotFound() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <CircleAlert className="h-24 w-24" />
      <p className="text-sm font-semibold">User not found</p>
      <p className="text-sm text-center text-balance w-64">
        User could not be found in {env.NEXT_PUBLIC_APP_NAME} or COSMO.
      </p>
    </main>
  );
}
