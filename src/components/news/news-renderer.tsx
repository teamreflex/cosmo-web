import {
  isBannerSection,
  isExclusiveSection,
  isFeedSection,
} from "@/lib/universal/cosmo/news";
import { TokenPayload } from "@/lib/universal/auth";
import NewsSectionFeed from "./news-section-feed";
import NewsSectionExclusive from "./news-section-exclusive";
import NewsSectionBanner from "./news-section-banner";
import { getProfile } from "@/app/data-fetching";
import { fetchHomeNews } from "@/lib/server/cosmo/news";

type Props = {
  user: TokenPayload;
};

export default async function NewsRenderer({ user }: Props) {
  const profile = await getProfile(user.profileId);
  const news = await fetchHomeNews(user.accessToken, profile.artist);

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
