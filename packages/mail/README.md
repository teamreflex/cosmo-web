# @apollo/mail

The SES sender and the react-email templates shared by apps/web (auth emails) and apps/schedules ([notification emails](../../docs/trades/notification-emails.md)), so every email Apollo sends comes from one sender with one look.

| Export                                                      | Holds                                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `createMailer()`                                            | one SES client built from a `MailConfig`, and its `send()`, which renders and sends one `Mail` |
| `VerifyEmail`, `PasswordResetEmail`, `AccountDeletionEmail` | the auth emails, each taking a `RenderConfig` and the link                                     |
| `NotificationEmail`                                         | a notification email, taking a `RenderConfig`, its items and the opt-out link                  |
| `notificationSubject()`                                     | a notification email's subject: its first item's, with "(+N more)"                             |

- Each email is its own template in `src/emails`: the preview server renders its default export with its `PreviewProps`, and the app that sends it renders the same component, with the subject written beside the send. React escapes every prop, so they can carry usernames.
- Each notification type's wording is in `itemLine()` and `itemDetail()` (`src/emails/_components/notification-items.tsx`); a new type fails to compile until both cover it. The subject is the item's line unless `itemSubject()` (`src/subject.ts`) words it differently.
- The package never reads env. Each app builds `MailConfig` itself: apps/web in `apps/web/src/lib/server/mail.server.tsx`, and apps/schedules in `Mailer` (`apps/schedules/src/mailer.ts`) through `Config`.
- `endpoint` points at floci locally and is left unset in production, where mail goes to real SES ([`docs/tooling.md`](../../docs/tooling.md#local-services)).
- The logo is a PNG at apps/web's `public/email/logo.png`, which both apps pass as an absolute `logoUrl`, because Gmail and Outlook render no SVG and strip `data:` images. `src/emails/static/logo.png` links to it for the preview server.
- Templates use react-email's `Tailwind` with hex colors, because most mail clients can't parse Tailwind's default oklch palette.

## Trade summary

`TradeSummary()` (`src/emails/_components/objekts.tsx`) shows what a trade swaps: a sentence carrying the counts and payments ("You get **3 objekts** for **2 objekts** and **USD 12.50**"), then one strip of thumbnails, the side the recipient gets, ⇄, the side they send.

```
  <!--[if mso]>  classic Outlook for Windows (Word renders it, no WebP, no border-radius):
                 a VML roundrect in the collection's background colour, its number in its text colour
  <!--[if !mso]> every other client: the WebP front image, carrying the same colours and
                 "<member> <number> #<serial>" as styled alt text for when images are blocked
```

- Each side shows three slots, the last a "+N" tile when more don't fit, then its payments. Three a side plus the arrow fit a 360px phone without media queries, which email can't count on.
- The sentence carries every fact, so the email reads with images off, in Outlook and to screen readers; the thumbnails are for recognising objekts.
- `thumbHtml()` and `moreHtml()` write raw HTML, because React can't emit conditional comments, so they escape every value themselves and accept only hex colours. Each `v:roundrect` declares its own `xmlns:v`, so the `<html>` tag needs none.

## Previewing

`bun run dev` serves every template in `src/emails` at `localhost:3003` with sample props, and `turbo dev` or `turbo preview` in apps/web starts it too. `notification.tsx` previews a rolled-up email and `notification-types/` one email per type, from the samples in `_components/samples.ts`. A file under `src/emails` is a template unless it sits in a `_`-prefixed folder such as `_components`.
