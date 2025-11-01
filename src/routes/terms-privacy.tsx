import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/terms-privacy")({
  head: () =>
    defineHead({ title: "Terms & Privacy", canonical: "/terms-privacy" }),
  component: TermsPrivacy,
});

function TermsPrivacy() {
  return (
    <div className="container flex max-w-3xl flex-col gap-2 py-2">
      <Card>
        <CardHeader>
          <CardTitle>{m.terms_title()}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ul className="list-inside list-disc space-y-2">
            <li>
              {m.terms_email_usage()}
            </li>
            <li>
              {m.terms_email_receive()}
            </li>
            <li>{m.terms_delete_account()}</li>
            <li>
              {m.terms_cosmo_linking()}
            </li>
            <li>
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
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
