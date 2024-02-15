import Skeleton from "@/components/skeleton/skeleton";

export default function RekordArchiveLoading() {
  return (
    <main className="container flex flex-col py-2 mx-auto w-full sm:w-1/2">
      <Skeleton className="w-full h-24" />
    </main>
  );
}
