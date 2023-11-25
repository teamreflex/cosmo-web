export default async function GridEditionLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-6">
          <div className="flex flex-row gap-2 pt-1 pb-1 px-1 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
            <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
