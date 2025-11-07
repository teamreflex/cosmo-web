import type { ComponentType } from "react";
import type { ValidArtist } from "@apollo/cosmo/types/common";

type Props = {
  artist: ValidArtist;
};

export default function ArtistLogo({ artist }: Props) {
  const LogoComponent = logo[artist];

  if (!LogoComponent) {
    return null;
  }

  return (
    <div className="mb-[2px] flex h-(--sidebar-width) w-[calc(var(--sidebar-width)*1.2)] rotate-90">
      <LogoComponent />
    </div>
  );
}

const logo: Record<ValidArtist, ComponentType | null> = {
  idntt: idntt,
  artms: null,
  tripleS: null,
} as const;

function idntt() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 45 16"
      className="h-full w-full"
    >
      <g fill="currentColor" clipPath="url(#a)">
        <path d="M3.957.089H0v2.616h3.957V.089ZM3.897 3.481H.08v12.275h3.817V3.481ZM42.833 3.491V.379l-3.777.901v2.211h-3.102V.379l-3.777.901v2.211h-1.618v1.227a2.474 2.474 0 0 0-.239-.365c-.58-.73-1.595-1.1-3.016-1.1-1.056 0-2.007.216-2.826.641-.826.43-1.547 1.157-2.142 2.158a4.003 4.003 0 0 0-.042.072l.422-2.632H19.36l-2.2 11.124V0h-3.798v5.305a4.115 4.115 0 0 0-1.25-1.334c-.713-.478-1.596-.72-2.623-.72-1.028 0-1.956.242-2.682.718-.729.478-1.292 1.21-1.673 2.176-.371.942-.56 2.157-.56 3.61 0 1.454.19 2.595.562 3.505.382.934.94 1.633 1.657 2.077.712.44 1.585.663 2.595.663 1.083 0 2.001-.256 2.729-.762.505-.351.922-.816 1.245-1.389v1.912h7.4l1.197-6.052c.222-.844.486-1.529.784-2.035.33-.56.718-.957 1.154-1.183.445-.229.968-.345 1.555-.345.487 0 .862.058 1.115.173.213.096.34.238.398.445.068.246.06.595-.029 1.038l-1.574 7.96h3.788L30.8 7.42c.077-.39.116-.754.119-1.094h1.258v9.435h3.777V6.326h3.103v9.435h3.777V6.326h2.137V3.49h-2.138ZM13.07 11.768c-.185.51-.457.871-.834 1.103-.382.235-.863.354-1.43.354-.823 0-1.406-.258-1.782-.79-.394-.557-.594-1.499-.594-2.8 0-1.3.2-2.285.596-2.85.376-.537.952-.799 1.76-.799.577 0 1.06.122 1.436.362.367.235.65.614.839 1.127.2.543.3 1.27.3 2.16 0 .891-.098 1.597-.291 2.133Z" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="currentColor" d="M0 0h45v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
