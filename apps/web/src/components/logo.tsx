import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

type Props = {
  className?: string;
};

export default function Logo({ className }: Props) {
  return (
    <Link to="/" className={cn("h-full", className)}>
      <LogoSVG />
    </Link>
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
      className={cn("group aspect-750/450 h-full dark:drop-shadow", className)}
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
          <defs>
            <clipPath id="eye-clip">
              <rect
                x="420"
                y="418"
                width="160"
                height="65"
                className="group-hover:animate-[blink_0.15s_ease-in-out]"
              />
            </clipPath>
          </defs>
          <g clipPath="url(#eye-clip)">
            <path
              className={cn("fill-[#000000]", themed && "fill-background")}
              d="M551 482.56c12.59 0 22.8-10.21 22.8-22.8V441.7c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v18.06c0 12.59 10.21 22.8 22.8 22.8zM447.17 482.56c12.59 0 22.8-10.21 22.8-22.8V441.7c0-12.59-10.21-22.8-22.8-22.8s-22.8 10.21-22.8 22.8v18.06c0 12.59 10.21 22.8 22.8 22.8z"
            />
          </g>
          <style>
            {`
              @keyframes blink {
                0%, 100% { 
                  height: 65px;
                  y: 418px;
                }
                50% { 
                  height: 0px;
                  y: 450px;
                }
              }
            `}
          </style>
        </g>
      </switch>
    </svg>
  );
}
