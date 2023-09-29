import {
  fetchHomeNews,
  isBannerSection,
  isExclusiveSection,
  isFeedSection,
} from "@/lib/server/cosmo";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { TokenPayload } from "@/lib/server/jwt";
import { cache } from "react";
import NewsSectionFeed from "./news-section-feed";
import NewsSectionExclusive from "./news-section-exclusive";
import NewsSectionBanner from "./news-section-banner";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

const fetchNewsForArtist = cache(
  async (token: string, artist: ValidArtist) =>
    await fetchHomeNews(token, artist)
);

export default async function NewsRenderer({ user, artist }: Props) {
  const news = await fetchNewsForArtist(user.cosmoToken, artist);

  return (
    <div className="flex flex-col items-center divide-y-2 divide-accent container px-4">
      {news.map((section) => {
        if (isBannerSection(section)) {
          return <NewsSectionBanner key={section.type} section={section} />;
        }
        if (isFeedSection(section)) {
          return (
            <NewsSectionFeed
              key={section.type}
              section={section}
              fullWidth={false}
            />
          );
        }
        if (isExclusiveSection(section)) {
          return <NewsSectionExclusive key={section.type} section={section} />;
        }
      })}
    </div>
  );
}
