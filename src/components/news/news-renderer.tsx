import {
  isBannerSection,
  isExclusiveSection,
  isFeedSection,
} from "@/lib/server/cosmo";
import { TokenPayload } from "@/lib/server/jwt";
import NewsSectionFeed from "./news-section-feed";
import NewsSectionExclusive from "./news-section-exclusive";
import NewsSectionBanner from "./news-section-banner";
import { fetchNewsForSelectedArtist } from "@/app/data-fetching";

type Props = {
  user: TokenPayload;
};

export default async function NewsRenderer({ user }: Props) {
  const news = await fetchNewsForSelectedArtist(user.id, user.accessToken);

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
