import LogoImage from "@/assets/logo.png";
import Image from "next/image";
import { env } from "@/env.mjs";

export default function HomeLoading() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <Image
        className="animate-bounce"
        src={LogoImage.src}
        height={100}
        width={100}
        quality={100}
        alt={env.NEXT_PUBLIC_APP_NAME}
        priority={true}
      />
    </div>
  );
}
