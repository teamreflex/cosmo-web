import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cosmo · Login",
  description: "Cosmo",
};

export default function LoginPage() {
  return (
    <main className="w-full flex min-h-screen flex-col md:items-center justify-between px-12 py-24">
      <div className="text-5xl font-bold flex flex-col md:flex-row gap-2 py-24">
        <h1>Welcome</h1>
        <h1>to Cosmo</h1>
      </div>

      <div className="w-full flex justify-center">
        <Button variant="cosmo" asChild>
          <Link href="/login/email">Continue with Email</Link>
        </Button>
      </div>
    </main>
  );
}
