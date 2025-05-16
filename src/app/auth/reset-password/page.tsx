import ResetPassword from "@/components/auth/reset-password";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage(props: Props) {
  const searchParams = await props.searchParams;

  if (!searchParams.token) {
    redirect("/");
  }

  return (
    <main className="container flex flex-col py-2">
      <div className="flex gap-2 items-center w-full pb-1">
        <h1 className="text-3xl font-cosmo uppercase">Reset Password</h1>
      </div>

      <div className="w-full md:w-1/2 mx-auto">
        <ResetPassword token={searchParams.token} />
      </div>
    </main>
  );
}
