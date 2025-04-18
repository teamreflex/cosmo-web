import { LogoSVG } from "@/components/logo";

export default function Maintenance() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full sm:w-1/3 mx-auto py-24 px-4 text-center text-sm">
      <LogoSVG className="h-12" />
      <p>
        MODHAUS has switched COSMO over to a completely new login system and
        blockchain.
      </p>
      <p>
        Migrating Apollo over to these new systems will take a while, but
        updates will be posted here as they come.
      </p>
    </div>
  );
}
