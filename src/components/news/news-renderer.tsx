import {
  isBannerSection,
  isExclusiveSection,
  isFeedSection,
  isRekordSection,
} from "@/lib/universal/cosmo/news";
import NewsSectionFeed from "./news-section-feed";
import NewsSectionExclusive from "./news-section-exclusive";
import NewsSectionBanner from "./news-section-banner";
import { decodeUser } from "@/app/data-fetching";
import { fetchHomeNews } from "@/lib/server/cosmo/news";
import NewsSectionRekord from "./news-section-rekord";
import { getSelectedArtist } from "@/lib/server/profiles";

export default async function NewsRenderer() {
  const user = await decodeUser();
  const news = await fetchHomeNews(user!.accessToken, getSelectedArtist());

  return (
    <div className="flex flex-col items-center container py-2">
      {news.map((section) => {
        if (isRekordSection(section)) {
          return <NewsSectionRekord key={section.type} section={section} />;
        }

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
