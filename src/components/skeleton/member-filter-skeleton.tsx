import Skeleton from "./skeleton";

export default function MemberFilterSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1 w-full">
      {/* artms */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-full" />
        ))}
      </div>

      {/* triples */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 21 }).map((_, i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-full" />
        ))}
      </div>
    </div>
  );
}
