import { Skeleton } from "../ui/skeleton";

type Props = {
  artists?: boolean;
};

export default function MemberFilterSkeleton({ artists = true }: Props) {
  return (
    <div className="flex flex-col gap-2 p-1 w-full">
      {/* idntt */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 0 + (artists ? 1 : 0) }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 justify-center items-center"
          >
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="md:hidden w-7 h-2 rounded-full" />
          </div>
        ))}
      </div>

      {/* artms */}
      <div className="flex flex-row gap-2 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {Array.from({ length: 5 + (artists ? 1 : 0) }).map((_, i) => (
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
        {Array.from({ length: 24 + (artists ? 1 : 0) }).map((_, i) => (
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
