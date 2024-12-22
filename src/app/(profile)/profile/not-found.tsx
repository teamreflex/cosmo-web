import { LuCircleAlert } from "react-icons/lu";

export default function UserNotFound() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <LuCircleAlert className="h-24 w-24" />
      <p className="text-sm font-semibold">User not found</p>
      <p className="text-sm text-center text-balance w-64">
        If you recently changed your COSMO ID, you may need to sign out and back
        in again to update it.
      </p>
    </main>
  );
}
