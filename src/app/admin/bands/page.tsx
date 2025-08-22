import { getSession } from "@/app/data-fetching";
import InsertBands from "@/components/admin/bands/insert-bands";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Objekt Bands",
};

export default async function AdminObjektBandsPage() {
  const session = await getSession();
  if (!session?.user.isAdmin) {
    redirect("/");
  }

  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertBands />
    </section>
  );
}
