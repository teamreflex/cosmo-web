import { Skeleton } from "../ui/skeleton";

type Props = {
  artists?: boolean;
};

export default function MemberFilterSkeleton({ artists = true }: Props) {
  return (
    <div className="flex w-full flex-col gap-2 p-1">
      {/* idntt */}
      <div className="no-scrollbar flex h-fit flex-row justify-items-start gap-2 overflow-x-scroll sm:justify-center">
        {Array.from({ length: 0 + (artists ? 1 : 0) }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-1"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-2 w-7 rounded-full md:hidden" />
          </div>
        ))}
      </div>

      {/* artms */}
      <div className="no-scrollbar flex h-fit flex-row justify-items-start gap-2 overflow-x-scroll sm:justify-center">
        {Array.from({ length: 5 + (artists ? 1 : 0) }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-1"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-2 w-7 rounded-full md:hidden" />
          </div>
        ))}
      </div>

      {/* triples */}
      <div className="no-scrollbar flex h-fit flex-row justify-items-start gap-2 overflow-x-scroll sm:justify-center">
        {Array.from({ length: 24 + (artists ? 1 : 0) }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-1"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-2 w-7 rounded-full md:hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}
