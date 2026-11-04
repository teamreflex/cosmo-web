import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

export type RenderConfig = {
  appName: string;
  /**
   * An absolute URL to the logo PNG, because Gmail and Outlook don't render
   * SVG and strip `data:` images. The apps serve it from apps/web's
   * `public/email/logo.png`; the preview server serves it from `static/`.
   */
  logoUrl: string;
};

// hex rather than Tailwind's oklch palette, which most mail clients can't parse
const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        page: "#f4f4f6",
        line: "#e4e4e7",
        ink: "#18181b",
        muted: "#71717a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
};

type LayoutProps = {
  config: RenderConfig;
  // the inbox's preview line
  preview: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * The logo above a white card on a grey page, with an optional muted footer.
 */
export function Layout({ config, preview, children, footer }: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="m-0 bg-page font-sans text-ink">
          <Container className="mx-auto max-w-[560px] px-4 py-8">
            <Img
              src={config.logoUrl}
              alt={config.appName}
              width="80"
              height="48"
              className="mb-5 ml-6"
            />
            <Section className="rounded-xl border border-solid border-line bg-white p-8">
              {children}
            </Section>
            {footer === undefined ? null : (
              <Section className="px-8 pt-5 text-[13px] leading-[1.5] text-muted">
                {footer}
              </Section>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text className="m-0 mb-4 text-[15px] leading-[1.6]">{children}</Text>;
}

export function ActionButton({ label, url }: { label: string; url: string }) {
  return (
    <Button
      href={url}
      className="rounded-lg bg-ink px-5 py-3 text-[15px] font-semibold text-white no-underline"
    >
      {label}
    </Button>
  );
}

// the button's link spelled out, for clients that hide or break the button
export function PasteLink({ url }: { url: string }) {
  return (
    <Text className="m-0 mt-4 text-[13px] leading-[1.5] break-all text-muted">
      Or paste this link into your browser:{" "}
      <Link href={url} className="text-muted underline">
        {url}
      </Link>
    </Text>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Text className="m-0 mt-4 text-[13px] leading-[1.5] text-muted">
      {children}
    </Text>
  );
}
