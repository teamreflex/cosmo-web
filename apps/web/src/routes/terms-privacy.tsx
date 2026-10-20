import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { defineHead } from "@/lib/meta";
import { CHAT_RETENTION_DAYS } from "@apollo/trades/timers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-privacy")({
  head: () =>
    defineHead({ title: "Terms & Privacy", canonical: "/terms-privacy" }),
  component: TermsPrivacy,
});

function TermsPrivacy() {
  const appName = env.VITE_APP_NAME;

  return (
    <div className="container flex max-w-3xl flex-col gap-2 py-2">
      <Card>
        <CardHeader>
          <CardTitle>{m.terms_title()}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm [&:lang(ko)]:break-keep">
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{m.terms_section_account()}</h2>
            <ul className="list-outside list-disc space-y-2 pl-5">
              <li>{m.terms_email_usage()}</li>
              <li>{m.terms_email_receive()}</li>
              <li>{m.terms_cosmo_linking()}</li>
              <li>{m.terms_delete_account()}</li>
              <li>{m.terms_feedback_address({ appName })}</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{m.terms_section_trading()}</h2>
            <ul className="list-outside list-disc space-y-2 pl-5">
              <li>{m.terms_trading_matching({ appName })}</li>
              <li>{m.terms_trading_modhaus({ appName })}</li>
              <li>{m.terms_trading_public()}</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{m.terms_section_chat()}</h2>
            <ul className="list-outside list-disc space-y-2 pl-5">
              <li>{m.terms_chat_retention({ days: CHAT_RETENTION_DAYS })}</li>
              <li>{m.terms_chat_staff_access()}</li>
            </ul>
          </section>

          <p>
            {m.terms_source_code()}{" "}
            <a
              href="https://github.com/teamreflex/cosmo-web"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
