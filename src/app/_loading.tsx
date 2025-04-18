import { LogoSVG } from "@/components/logo";

export default function RootLoading() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <LogoSVG className="animate-bounce size-24" />
    </div>
  );
}
