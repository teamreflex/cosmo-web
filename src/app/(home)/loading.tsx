export default function HomeLoading() {
  return (
    <main className="flex flex-col items-center container py-2">
      <div className="flex flex-col gap-2 items-center animate-pulse w-full sm:w-1/2 py-4">
        <div className="bg-accent rounded-lg aspect-video w-full" />
      </div>
    </main>
  );
}
