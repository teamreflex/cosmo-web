import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";

export default function UserProgressLoading() {
  return (
    <div className="flex flex-col">
      <MemberFilterSkeleton artists={false} />
    </div>
  );
}
