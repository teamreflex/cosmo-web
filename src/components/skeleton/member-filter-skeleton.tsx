import Skeleton from "./skeleton";

export default function MemberFilterSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-1 w-full">
      {/* artms */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 justify-center items-center"
          >
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="md:hidden w-7 h-2 rounded-full" />
          </div>
        ))}
      </div>

      {/* triples */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 justify-center items-center"
          >
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="md:hidden w-7 h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
