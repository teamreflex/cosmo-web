import { LogoSVG } from "@/components/logo";

export default function MaintenancePage() {
  return (
    <main className="container flex items-center justify-center flex-col py-2">
      <LogoSVG className="w-24 h-24" />
      <h1 className="text-3xl font-cosmo uppercase">Maintenance</h1>
      <div className="text-sm font-semibold text-muted-foreground">
        <p>We should be back by 6am KST (Jan. 17)</p>
      </div>
    </main>
  );
}
