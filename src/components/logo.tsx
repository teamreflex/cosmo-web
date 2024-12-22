import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { env } from "@/env.mjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LuCheck, LuGithub } from "react-icons/lu";

type Props = {
  className?: string;
};

export default function Logo({ className }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className={cn("h-full cursor-pointer", className)}>
          <LogoSVG />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.NEXT_PUBLIC_APP_NAME}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is an unofficial desktop client for{" "}
                <span className="italic">Cosmo: the Gate</span>.
              </p>
              <p>Source code can be found below.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel asChild>
            <Link
              href="https://github.com/teamreflex/cosmo-web"
              target="_blank"
            >
              <LuGithub />
            </Link>
          </AlertDialogCancel>
          <AlertDialogAction>
            <LuCheck />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type LogoSVGProps = {
  className?: string;
  themed?: boolean;
};

export function LogoSVG({ className, themed = true }: LogoSVGProps) {
  return (
    <svg
      version="1.2"
      baseProfile="tiny"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="125 275 750 450"
      xmlSpace="preserve"
      className={cn("aspect-750/450 h-full", className)}
    >
      <switch>
        <g>
          {/* legs */}
          <g className={cn("fill-[#8E7FF9]", themed && "fill-foreground")}>
            <path d="M585.01 572.15c-11.38 2.99-23.14 5.86-35.24 8.62V479.51c0-9.73 7.89-17.62 17.62-17.62s17.62 7.89 17.62 17.62v92.64zM658.66 667.27c0 30.02-24.42 54.45-54.44 54.45-30.02 0-54.45-24.43-54.45-54.45v-53.54c11.95-2.64 23.71-5.41 35.24-8.28v61.82c0 10.6 8.61 19.21 19.21 19.21 10.59 0 19.2-8.61 19.2-19.21 0-9.73 7.89-17.62 17.62-17.62s17.62 7.9 17.62 17.62zM449.76 479.51v119.8c-12.06 1.71-23.82 3.16-35.23 4.34V479.51c0-9.73 7.89-17.62 17.61-17.62 9.73 0 17.62 7.89 17.62 17.62zM414.52 636.84c11.56-1.37 23.31-2.93 35.23-4.68v35.11c0 30.02-24.42 54.45-54.44 54.45s-54.45-24.43-54.45-54.45c0-9.73 7.89-17.62 17.62-17.62s17.62 7.89 17.62 17.62c0 10.6 8.61 19.21 19.21 19.21 10.59 0 19.21-8.61 19.21-19.21v-30.43z" />
          </g>

          {/* ring */}
          <path
            className={cn("fill-[#A398F7]", themed && "fill-foreground")}
            d="M475.91 403.35c203.13-41.25 378.59-31.36 391.9 22.1 13.31 53.45-140.58 130.23-343.71 171.48-203.13 41.25-378.59 31.36-391.9-22.1-13.31-53.46 140.57-130.23 343.71-171.48zM238.27 553.29c11.09 44.56 137.27 56.9 281.82 27.54s252.74-89.28 241.65-133.84c-11.09-44.56-137.27-56.9-281.82-27.54-144.56 29.35-252.75 89.27-241.65 133.84z"
          />

          {/* ears */}
          <path
            className={cn("fill-[#8E7FF9]", themed && "fill-foreground/90")}
            d="M551 362.02c12.59 0 22.8-10.21 22.8-22.8v-38.15c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v38.15c0 12.6 10.21 22.8 22.8 22.8zM447.17 362.02c12.59 0 22.8-10.21 22.8-22.8v-38.15c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v38.15c0 12.6 10.21 22.8 22.8 22.8z"
          />

          {/* body */}
          <path
            className={cn("fill-[#A398F7]", themed && "fill-foreground")}
            d="M403.94 540.35h191.64c39.33 0 71.22-31.89 71.22-71.22V453.9c0-78.42-63.57-141.99-141.99-141.99h-50.09c-78.42 0-141.99 63.57-141.99 141.99v15.22c-.01 39.34 31.88 71.23 71.21 71.23z"
          />

          {/* eyes */}
          <path
            className={cn("fill-[#000000]", themed && "fill-background")}
            d="M551 482.56c12.59 0 22.8-10.21 22.8-22.8V441.7c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v18.06c0 12.59 10.21 22.8 22.8 22.8zM447.17 482.56c12.59 0 22.8-10.21 22.8-22.8V441.7c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v18.06c0 12.59 10.21 22.8 22.8 22.8z"
          />
        </g>
      </switch>
    </svg>
  );
}
