import { LogoSVG } from "@/components/logo";

export const runtime = "edge";

export default function Maintenance() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full sm:w-1/3 mx-auto py-24 px-4 text-center text-sm">
      <LogoSVG className="h-12" />
      <p>
        With the new COSMO update, it&apos;s no longer feasible for Apollo to
        continue.
      </p>
      <p>
        While the new login system is much better than the old one, they have
        deliberately made it so unoffical apps like Apollo cannot use it (or at
        least not without significant reverse engineering effort).
      </p>
      <p>
        MODHAUS is completely within their right to protect the service.
        It&apos;s clear at this point that they don&apos;t want unofficial apps
        bypassing authentication and security measures.
      </p>

      <p>Objekt list data still exists and will be exportable soon.</p>

      <p>
        Thanks to Nites & geminipoems for updating the objekt descriptions as
        soon as they dropped, everyone that reported bugs, made suggestions and
        trusted with their accounts.
      </p>

      <p className="text-xs">can we get an official desktop app now jaden</p>
    </div>
  );
}
