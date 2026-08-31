import type { AnyRouteMatch } from "@tanstack/react-router";
import type {
  DetailedHTMLProps,
  MetaHTMLAttributes,
  ScriptHTMLAttributes,
  StyleHTMLAttributes,
} from "react";
import { env } from "./env/client";

// https://paperclover.net/blog/webdev/one-year-next-app-router
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
  /** Adds `<link rel="..." href="..." />` */
  links?: AnyRouteMatch["links"];

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
  const canonical = meta.canonical ? new URL(meta.canonical, base).href : null;

  const { openGraph, twitter } = meta.embed
    ? applyEmbed(meta.embed, meta, title, canonical)
    : { openGraph: meta.openGraph, twitter: meta.twitter };

  const metaTags: MetaDescriptor[] = [{ title }];
  const simpleTags: Array<[name: string, content: string | null | undefined]> =
    [
      ["description", meta.description],
      ...(meta.authors ?? []).map((author): [string, string] => [
        "author",
        author,
      ]),
      ["keywords", meta.keywords?.join(", ")],
      ["publisher", meta.publisher],
      ["referrer", meta.referrer],
    ];
  for (const [name, content] of simpleTags) {
    if (content) {
      metaTags.push({ name, content });
    }
  }
  if (meta.themeColor) {
    metaTags.push(...themeColorTags(meta.themeColor));
  }
  if (meta.denyRobots) {
    metaTags.push({ name: "robots", content: "noindex,nofollow" });
  }
  if (meta.viewport) {
    metaTags.push({ name: "viewport", content: meta.viewport });
  }

  const links = meta.links ?? [];
  if (canonical) {
    links.push({ rel: "canonical", href: canonical });
  }
  if (meta.manifest) {
    links.push({ rel: "manifest", href: meta.manifest });
  }

  if (openGraph) renderOpenGraph(metaTags, "og:", openGraph);
  if (twitter) renderOpenGraph(metaTags, "twitter:", twitter);

  const styles: StyleDescriptor[] = [];
  const scripts: ScriptDescriptor[] = [];
  collectExtras(meta.extra ?? [], { links, meta: metaTags, scripts, styles });

  return {
    meta: metaTags,
    links,
    scripts,
    styles,
  };
}

/**
 * Merges the AutoEmbed shorthand into OpenGraph/Twitter tag sets. Explicit
 * `meta.openGraph`/`meta.twitter` fields win over embed-derived defaults,
 * except image/site_name/url which the embed always controls.
 */
function applyEmbed(
  embed: AutoEmbed,
  meta: Meta,
  title: string,
  canonical: string | null,
) {
  const openGraph: OpenGraph = {
    type: "website",
    title: embed.title ?? title,
    description: embed.description ?? meta.description ?? null,
    ...meta.openGraph,
  };
  const twitter: Twitter = {
    card:
      (embed.thumbnailSize ?? (embed.thumbnail ? "banner" : "icon")) ===
      "banner"
        ? "summary_large_image"
        : "summary",
    ...meta.twitter,
  };
  if (embed.thumbnail) {
    openGraph.image = embed.thumbnail;
  }
  if (embed.siteTitle) {
    openGraph.site_name = embed.siteTitle;
  }
  if (canonical) {
    openGraph.url = canonical;
  }
  return { openGraph, twitter };
}

function themeColorTags(
  themeColor: NonNullable<Meta["themeColor"]>,
): MetaDescriptor[] {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the themeColor union
  if (typeof themeColor === "string") {
    return [{ name: "theme-color", content: themeColor }];
  }
  return [
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
  ];
}

/** Sorts `meta.extra` JSX elements into the tag bucket matching their type. */
function collectExtras(
  extra: React.ReactElement[],
  buckets: {
    meta: MetaDescriptor[];
    links: NonNullable<Meta["links"]>;
    styles: StyleDescriptor[];
    scripts: ScriptDescriptor[];
  },
) {
  for (const { type, props } of extra) {
    switch (type) {
      case "meta":
        // SAFETY: "meta" entries carry meta descriptor props
        buckets.meta.push(props as MetaDescriptor);
        break;
      case "link":
        // SAFETY: "link" entries carry link descriptor props
        buckets.links.push(props as (typeof buckets.links)[number]);
        break;
      case "style":
        // SAFETY: "style" entries carry style descriptor props
        buckets.styles.push(props as StyleDescriptor);
        break;
      case "script":
        // SAFETY: "script" entries carry script descriptor props
        buckets.scripts.push(props as ScriptDescriptor);
        break;
    }
  }
}
type MetaDescriptor = DetailedHTMLProps<
  MetaHTMLAttributes<HTMLMetaElement>,
  HTMLMetaElement
>;
type StyleDescriptor = DetailedHTMLProps<
  StyleHTMLAttributes<HTMLStyleElement>,
  HTMLStyleElement
>;
type ScriptDescriptor = DetailedHTMLProps<
  ScriptHTMLAttributes<HTMLScriptElement>,
  HTMLScriptElement
>;
function renderOpenGraph(
  tags: MetaDescriptor[],
  name: string,
  content: OpenGraphField,
): void {
  if (!content) return;
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the OpenGraphField union
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
