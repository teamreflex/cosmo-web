import type {
  DetailedHTMLProps,
  MetaHTMLAttributes,
  ScriptHTMLAttributes,
  StyleHTMLAttributes,
} from "react";
// https://paperclover.net/blog/webdev/one-year-next-app-router
import { env } from "./env/client";

const base = `https://${env.VITE_BASE_URL}`;
const titleTemplate = (title: string) =>
  [title, env.VITE_APP_NAME].filter(Boolean).join(" · ");

export interface Meta {
  /** Required for all pages. `<title>{content}</title>` */
  title: string;
  /** Recommended for all pages. `<meta name="description" content="{...}" />` */
  description?: string | null;
  /** Automatically added for static renders from the 'pages' folders. */
  canonical?: string | null;
  /** Add `<link rel="alternate" ... />`. Object keys are interpretted as
   * mime types if they contain a slash, otherwise seen as an alternative language. */
  alternates?: Alternate[] | Record<string, string>;

  /** Automatically generate both OpenGraph and Twitter meta tags */
  embed?: AutoEmbed | null;
  /** Add a robots tag for `noindex` and `nofollow` */
  denyRobots?: boolean | null;
  /** Add 'og:*' meta tags */
  openGraph?: OpenGraph | null;
  /** Add 'twitter:*' meta tags */
  twitter?: Twitter | null;
  /**
   * 'meta.ts' intentionally excludes a lot of exotic tags.
   * Add these manually using JSX syntax:
   *
   *     extra: [
   *       <meta name="site-verification" content="waffles" />,
   *     ],
   *
   * These are not rendered with React but simply parsed as objects.
   */
  extra?: React.ReactElement[];

  /** Adds `<meta name="author" content="{...}" />` */
  authors?: string[];
  /** Adds `<meta name="keywords" content="{keywords.join(', ')}" />` */
  keywords?: string[];
  /** URL to a manifest; https://developer.mozilla.org/en-US/docs/Web/Manifest */
  manifest?: string | null;
  /** Adds `<meta name="publisher" content="{...}" />` */
  publisher?: string | null;
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/referrer */
  referrer?: Referrer | null;
  /** Adds `<meta name="theme-color" content="{...}" />` */
  themeColor?: string | { dark: string; light: string } | null;
  /** Defaults to `width=device-width, initial-scale=1.0` for mobile compatibility. */
  viewport?: string;
}
export type Alternate =
  | { type: string; url: string }
  | {
      lang: string;
      url: string;
    };
export interface AutoEmbed {
  /* Defaults to the page title. */
  title?: string | null;
  /* Defaults to the page description. */
  description?: string | null;
  /* Provide to add an embed image. */
  thumbnail?: string | null;
  /** @default "banner", which applies twitter:card = "summary_large_image" */
  thumbnailSize?: "banner" | "icon";
  /* Ignored if not passed */
  siteTitle?: string | null;
}
/** See https://ogp.me for extra rules. */
export interface OpenGraph {
  /** The title of your object as it should appear within the graph */
  title?: string;
  /** A one to two sentence description of your object. */
  description?: string | null;
  /** The type of your object, e.g., "video.movie". Depending on the type you specify, other properties may also be required */
  type?: string;
  /** An image URL which should represent your object within the graph */
  image?: OpenGraphField;
  /** The canonical URL of your object that will be used as its permanent ID in the graph, e.g., "https://www.imdb.com/title/tt0117500/" */
  url?: string;
  /** A URL to an audio file to accompany this object */
  audio?: OpenGraphField;
  /** The word that appears before this object's title in a sentence. An enum of (a, an, the, "", auto). If auto is chosen, the consumer of your data should choose between "a" or "an". Default is "" (blank) */
  determiner?: string;
  /** The locale these tags are marked up in. Of the format language_TERRITORY. Default is en_US */
  locale?: string;
  /** An array of other locales this page is available in */
  "locale:alternate"?: string[];
  /** If your object is part of a larger web site, the name which should be displayed for the overall site. e.g., "IMDb" */
  site_name?: string;
  /** A URL to a video file that complements this object */
  video?: OpenGraphField;
  [field: string]: OpenGraphField;
}
/**
 * When passing an array, the property is duplicated.
 * When passing an object, the fields are emitted as namespaced with ':'.
 */
type OpenGraphField =
  | string
  | { [field: string]: OpenGraphField }
  | Array<OpenGraphField>
  | (null | undefined);
/** Twitter uses various OpenGraph fields if these are not specified. */
export interface Twitter {
  card: string;
  title?: string;
  description?: string | null;
  url?: string;
  image?: string;
  player?: string;
  /** Same logic as Open Graph */
  [field: string]: OpenGraphField;
}
export interface Alternates {
  canonical: string;
  types: { [mime: string]: AlternateType };
}
export interface AlternateType {
  url: string;
  title: string;
}
export type Referrer =
  | "no-referrer"
  | "origin"
  | "no-referrer-when-downgrade"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin";

export function defineHead(meta: Meta) {
  const title = titleTemplate(meta.title);
  const description = meta.description ?? null;
  const canonical = meta.canonical ? new URL(meta.canonical, base).href : null;
  const denyRobots = Boolean(meta.denyRobots);
  const authors = meta.authors ?? null;
  const keywords = meta.keywords ?? null;
  const manifest = meta.manifest ?? null;
  const publisher = meta.publisher ?? null;
  const referrer = meta.referrer ?? null;
  const themeColor = meta.themeColor ?? null;

  const embed = meta.embed ?? null;
  let openGraph = meta.openGraph ?? null;
  let twitter = meta.twitter ?? null;
  if (embed) {
    const { thumbnail, thumbnailSize, siteTitle } = embed;
    openGraph = {
      type: "website",
      title: embed.title ?? title,
      description: embed.description ?? description,
      ...openGraph,
    };
    twitter = {
      card:
        (thumbnailSize ?? (thumbnail ? "banner" : "icon")) === "banner"
          ? "summary_large_image"
          : "summary",
      ...twitter,
    };
    if (thumbnail) {
      openGraph.image = embed.thumbnail;
    }
    if (siteTitle) {
      openGraph.site_name = siteTitle;
    }
    if (canonical) {
      openGraph.url = canonical;
    }
  }

  const metaTags: MetaDescriptor[] = [{ title }];
  if (description) {
    metaTags.push({ name: "description", content: description });
  }
  for (const author of authors ?? []) {
    metaTags.push({ name: "author", content: author });
  }
  if (keywords) {
    metaTags.push({ name: "keywords", content: keywords.join(", ") });
  }
  if (publisher) {
    metaTags.push({ name: "publisher", content: publisher });
  }
  if (referrer) {
    metaTags.push({ name: "referrer", content: referrer });
  }
  if (themeColor) {
    if (typeof themeColor === "string") {
      metaTags.push({ name: "theme-color", content: themeColor });
    } else {
      metaTags.push(
        {
          name: "theme-color",
          media: "(prefers-color-scheme:light)",
          content: themeColor.light,
        },
        {
          name: "theme-color",
          media: "(prefers-color-scheme:dark)",
          content: themeColor.dark,
        },
      );
    }
  }
  if (denyRobots) {
    metaTags.push({ name: "robots", content: "noindex,nofollow" });
  }
  if (meta.viewport) {
    metaTags.push({ name: "viewport", content: meta.viewport });
  }

  const links: { rel: string; href: string }[] = [];
  if (canonical) {
    links.push({ rel: "canonical", href: canonical });
  }
  if (manifest) {
    links.push({ rel: "manifest", href: manifest });
  }

  if (openGraph) renderOpenGraph(metaTags, "og:", openGraph);
  if (twitter) renderOpenGraph(metaTags, "twitter:", twitter);

  const styles: DetailedHTMLProps<
    StyleHTMLAttributes<HTMLStyleElement>,
    HTMLStyleElement
  >[] = [];
  const scripts: DetailedHTMLProps<
    ScriptHTMLAttributes<HTMLScriptElement>,
    HTMLScriptElement
  >[] = [];

  if (meta.extra) {
    for (const { type, props } of meta.extra) {
      if (type === "meta") {
        metaTags.push(props as (typeof metaTags)[number]);
      } else if (type === "link") {
        links.push(props as (typeof links)[number]);
      } else if (type === "style") {
        styles.push(props as (typeof styles)[number]);
      } else if (type === "script") {
        scripts.push(props as (typeof scripts)[number]);
      }
    }
  }

  return {
    meta: metaTags,
    links,
    scripts,
    styles,
  };
}
type MetaDescriptor = DetailedHTMLProps<
  MetaHTMLAttributes<HTMLMetaElement>,
  HTMLMetaElement
>;
function renderOpenGraph(
  tags: MetaDescriptor[],
  name: string,
  content: OpenGraphField,
): void {
  if (!content) return;
  if (typeof content === "string") {
    tags.push({ name, content });
  }
  if (Array.isArray(content)) {
    for (const item of content) {
      renderOpenGraph(tags, name, item);
    }
  }
  for (const [key, item] of Object.entries(content)) {
    renderOpenGraph(tags, `${name}:${key}`, item);
  }
}
