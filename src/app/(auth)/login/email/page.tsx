import { Separator } from "@/components/ui/separator";
import { LoginForm } from "./login-form";

export default function EmailLoginPage() {
  return (
    <main className="w-full md:max-w-md mx-auto flex min-h-screen flex-col items-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-4">
        <p>This will send you an email via Ramper to log into Cosmo.</p>
        <p>
          Make sure to click{" "}
          <span className="font-bold">confirm from a different device</span> or
          else login will not work.
        </p>
      </div>

      <Separator />

      <LoginForm />
    </main>
  );
}
