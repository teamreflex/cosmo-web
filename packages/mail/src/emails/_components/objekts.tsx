import { formatSerial } from "@apollo/util";
import { Text } from "react-email";
import type { MailObjekt, MailPayment, MailTradeSide } from "../../content";

/**
 * Slots per side, the "+N" tile included. Three a side plus the arrow fit a
 * 360px phone, since email can't count on media queries to shrink them.
 */
const MAX_SLOTS = 3;
// an objekt's 5.5:8.5 proportions
const THUMB_WIDTH = 32;
const THUMB_HEIGHT = 50;
// 3px corners; VML's arcsize is a share of the shorter side
const THUMB_RADIUS = 3;
const ARCSIZE = `${Math.round((THUMB_RADIUS / THUMB_WIDTH) * 100)}%`;
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// the indexer's colours are "#rrggbb" or "#rrggbbaa"; VML's fillcolor takes the first
function hexColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)
    ? value.slice(0, 7)
    : fallback;
}

type Tile = {
  fill: string;
  stroke: string;
  text: string;
  textColor: string;
  fontSize: number;
};

/**
 * A rounded tile for classic Outlook for Windows, which renders with Word:
 * it ignores border-radius and shows no WebP, so the tile is a VML
 * roundrect. Only Word reads `[if mso]`.
 */
function outlookTileHtml(tile: Tile) {
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:${THUMB_WIDTH}px;height:${THUMB_HEIGHT}px;v-text-anchor:middle;" arcsize="${ARCSIZE}" fillcolor="${tile.fill}" strokecolor="${tile.stroke}" strokeweight="1px"><v:textbox inset="0,0,0,0"><center style="font-family:Arial,sans-serif;font-size:${tile.fontSize}px;font-weight:bold;color:${tile.textColor};">${escapeHtml(tile.text)}</center></v:textbox></v:roundrect><![endif]-->`;
}

/**
 * An objekt's thumbnail: Outlook gets a tile in its collection's colours
 * with its number, every other client the WebP image, which carries the
 * same colours and its name as alt text for when images are blocked. React
 * can't emit conditional comments, so this is raw HTML, escaped here.
 */
function thumbHtml(objekt: MailObjekt) {
  const fill = hexColor(objekt.backgroundColor, "#e4e4e7");
  const textColor = hexColor(objekt.textColor, "#18181b");
  return [
    outlookTileHtml({
      fill,
      stroke: "#d4d4d8",
      text: objekt.collectionNo,
      textColor,
      fontSize: 10,
    }),
    `<!--[if !mso]><!--><img src="${escapeHtml(objekt.imageUrl)}" width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}" alt="${escapeHtml(`${objekt.member} ${objekt.collectionNo} ${formatSerial(objekt.serial)}`)}" style="display:block;width:${THUMB_WIDTH}px;height:${THUMB_HEIGHT}px;border:0;border-radius:${THUMB_RADIUS}px;background-color:${fill};color:${textColor};font-family:${escapeHtml(FONT)};font-size:8px;font-weight:600;line-height:1.2;"><!--<![endif]-->`,
  ].join("");
}

// the "+N" tile standing in for the objekts that don't fit
function moreHtml(count: number) {
  const text = `+${count}`;
  return [
    outlookTileHtml({
      fill: "#f4f4f5",
      stroke: "#e4e4e7",
      text,
      textColor: "#3f3f46",
      fontSize: 12,
    }),
    `<!--[if !mso]><!--><div style="width:${THUMB_WIDTH}px;height:${THUMB_HEIGHT}px;box-sizing:border-box;border:1px solid #e4e4e7;border-radius:${THUMB_RADIUS}px;background-color:#f4f4f5;color:#3f3f46;font-family:${escapeHtml(FONT)};font-size:12px;font-weight:600;line-height:${THUMB_HEIGHT - 2}px;text-align:center;">${text}</div><!--<![endif]-->`,
  ].join("");
}

function formatPayment(payment: MailPayment) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payment.currency,
    currencyDisplay: "code",
  }).format(Number(payment.amount));
}

// "3 objekts and USD 12.50"
function sideParts(side: MailTradeSide) {
  const count = side.objekts.length;
  return [
    ...(count === 0 ? [] : [`${count} ${count === 1 ? "objekt" : "objekts"}`]),
    ...side.payments.map(formatPayment),
  ];
}

function Parts({ parts }: { parts: string[] }) {
  return parts.map((part, i) => (
    <span key={part}>
      {i > 0 ? " and " : null}
      <strong style={{ fontWeight: 600, color: "#18181b" }}>{part}</strong>
    </span>
  ));
}

/**
 * The sentence that carries the trade's facts, so it reads with images off,
 * in Outlook and to screen readers.
 */
function Summary({ get, send }: { get: string[]; send: string[] }) {
  return (
    <Text className="m-0 mt-4 text-[14px] leading-[22px] text-[#52525b]">
      {get.length === 0 ? (
        <>
          You send <Parts parts={send} />
        </>
      ) : (
        <>
          You get <Parts parts={get} />
          {send.length === 0 ? null : (
            <>
              {" for "}
              <Parts parts={send} />
            </>
          )}
        </>
      )}
    </Text>
  );
}

const cellStyle = { padding: "0 4px 0 0", verticalAlign: "middle" } as const;

// one side's cells: up to MAX_SLOTS thumbnails (the last a "+N" when more), then payments
function SideCells({ side }: { side: MailTradeSide }) {
  const { objekts } = side;
  const fits = objekts.length <= MAX_SLOTS;
  const shown = fits ? objekts : objekts.slice(0, MAX_SLOTS - 1);
  return (
    <>
      {shown.map((objekt) => (
        <td
          key={`${objekt.collectionNo}-${objekt.serial}`}
          style={cellStyle}
          dangerouslySetInnerHTML={{ __html: thumbHtml(objekt) }}
        />
      ))}
      {fits ? null : (
        <td
          style={cellStyle}
          dangerouslySetInnerHTML={{
            __html: moreHtml(objekts.length - shown.length),
          }}
        />
      )}
      {side.payments.map((payment) => (
        <td key={`${payment.currency}-${payment.amount}`} style={cellStyle}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              border: "1px solid #e4e4e7",
              borderRadius: "999px",
              backgroundColor: "#ffffff",
              color: "#18181b",
              fontSize: "12px",
              lineHeight: "16px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {formatPayment(payment)}
          </span>
        </td>
      ))}
    </>
  );
}

function isEmpty(side: MailTradeSide) {
  return side.objekts.length === 0 && side.payments.length === 0;
}

/**
 * What the trade swaps: a summary sentence, then one strip of what the
 * recipient gets, an arrow, and what they send. An empty side is left out.
 */
export function TradeSummary({
  youGet,
  youSend,
}: {
  youGet: MailTradeSide;
  youSend: MailTradeSide;
}) {
  const gets = !isEmpty(youGet);
  const sends = !isEmpty(youSend);
  if (!gets && !sends) return null;
  return (
    <>
      <Summary get={sideParts(youGet)} send={sideParts(youSend)} />
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{
          marginTop: "10px",
          border: "1px solid #e4e4e7",
          borderRadius: "8px",
          backgroundColor: "#fafafa",
          fontFamily: FONT,
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "10px 6px 10px 10px" }}>
              <table role="presentation" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    {gets ? <SideCells side={youGet} /> : null}
                    {gets && sends ? (
                      <td
                        aria-hidden="true"
                        style={{
                          padding: "0 12px 0 8px",
                          verticalAlign: "middle",
                          color: "#71717a",
                          fontSize: "16px",
                          lineHeight: "16px",
                        }}
                      >
                        ⇄
                      </td>
                    ) : null}
                    {sends ? <SideCells side={youSend} /> : null}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
