import { CosmoUpcomingGravity } from "@/lib/universal/cosmo/gravity";
import GravityHeader from "../gravity-header";

type Props = {
  gravity: CosmoUpcomingGravity;
};

export default function UpcomingDetails({ gravity }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <GravityHeader gravity={gravity} />

      <div className="flex justify-center w-full py-12">
        <h2 className="text-2xl font-bold">Gravity is about to start</h2>
      </div>
    </div>
  );
}
