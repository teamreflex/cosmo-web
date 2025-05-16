import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPrivacyPage() {
  return (
    <div className="container flex flex-col gap-2 max-w-3xl py-2">
      <Card>
        <CardHeader>
          <CardTitle>Terms & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ul className="list-inside list-disc space-y-2">
            <li>
              Email addresses are only used for sign in, account recovery, and
              social sign-in linking purposes.
            </li>
            <li>
              You will only receive emails from us if you have requested them
              for account recovery purposes.
            </li>
            <li>
              You can delete your account and all associated data at any time.
            </li>
            <li>
              Source code for this application is available on{" "}
              <Link
                href="https://github.com/teamreflex/cosmo-web"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </Link>
              .
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
