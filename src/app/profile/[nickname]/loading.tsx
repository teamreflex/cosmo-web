import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";

export default function UserCollectionLoading() {
  return (
    <div className="flex flex-col py-1">
      <MemberFilterSkeleton />
    </div>
  );
}
