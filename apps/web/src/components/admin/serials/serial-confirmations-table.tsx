import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { serialConfirmationsQuery } from "@/lib/queries/serials";
import { useSuspenseQuery } from "@tanstack/react-query";
import DeleteSerialConfirmation from "./delete-serial-confirmation";

export default function SerialConfirmationsTable() {
  const { data } = useSuspenseQuery(serialConfirmationsQuery);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {m.admin_serials_empty()}
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.admin_serials_token_id()}</TableHead>
            <TableHead>{m.admin_serials_collection()}</TableHead>
            <TableHead className="text-right">
              {m.admin_serials_confirmed_serial()}
            </TableHead>
            <TableHead className="text-right">
              {m.admin_serials_stored_serial()}
            </TableHead>
            <TableHead>{m.admin_serials_confirmed_by()}</TableHead>
            <TableHead>{m.admin_serials_confirmed_at()}</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.tokenId}>
              <TableCell className="font-mono text-xs">{row.tokenId}</TableCell>
              <TableCell>{row.objekt?.slug ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.confirmedSerial}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.objekt === null ? (
                  "—"
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    {row.objekt.serial !== row.confirmedSerial && (
                      <Badge variant="outline">
                        {m.admin_serials_pending()}
                      </Badge>
                    )}
                    <span>{row.objekt.serial}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {row.confirmedBy?.username ?? row.confirmedBy?.id ?? "—"}
              </TableCell>
              <TableCell>
                <Timestamp
                  date={row.confirmedAt}
                  format="MMM d, yyyy"
                  showTime
                  className="whitespace-nowrap"
                />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <DeleteSerialConfirmation tokenId={row.tokenId} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
