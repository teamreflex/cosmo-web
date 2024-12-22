import { LuFileQuestion } from "react-icons/lu";

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <LuFileQuestion className="w-24 h-24" />
      <p className="font-semibold text-sm text-center">Page not found</p>
    </div>
  );
}
