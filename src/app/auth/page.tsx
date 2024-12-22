import { LuHeartCrack } from "react-icons/lu";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auth",
};

export default function AuthPage() {
  return (
    <div className="flex flex-col gap-2 items-center container py-12">
      <LuHeartCrack className="w-24 h-24" />
      <p className="font-semibold text-sm text-center">
        You must sign in to view this page
      </p>
    </div>
  );
}
