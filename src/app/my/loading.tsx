export default async function MyLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Page</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center py-6">
        <div className="h-36 w-36 rounded-full bg-accent animate-pulse" />
        <div className="w-24 h-7 rounded bg-accent animate-pulse" />
        <div className="w-40 h-7 rounded bg-accent animate-pulse" />
      </div>
    </main>
  );
}
