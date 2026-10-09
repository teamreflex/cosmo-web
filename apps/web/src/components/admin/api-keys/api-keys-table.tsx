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
import { apiKeysQuery } from "@/lib/queries/api-keys";
import type { AdminApiKey } from "@/lib/universal/api-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import DeleteApiKey from "./delete-api-key";
import EditApiKeyDialog from "./edit-api-key-dialog";

function keyPreview(key: AdminApiKey): string {
  return key.start ? `${key.start}…` : "—";
}

export default function ApiKeysTable() {
  const { data } = useSuspenseQuery(apiKeysQuery);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {m.admin_api_keys_empty()}
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.admin_api_key_name()}</TableHead>
            <TableHead>{m.admin_api_key_user()}</TableHead>
            <TableHead>{m.admin_api_key_key()}</TableHead>
            <TableHead>{m.admin_api_key_status()}</TableHead>
            <TableHead className="text-right">
              {m.admin_api_key_requests()}
            </TableHead>
            <TableHead>{m.admin_api_key_expires()}</TableHead>
            <TableHead>{m.admin_api_key_created()}</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-medium">{key.name ?? "—"}</TableCell>
              <TableCell>{key.owner.username ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {keyPreview(key)}
              </TableCell>
              <TableCell>
                <Badge variant={key.enabled ? "secondary" : "outline"}>
                  {key.enabled
                    ? m.admin_api_key_status_enabled()
                    : m.admin_api_key_status_disabled()}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {key.requestCount}
              </TableCell>
              <TableCell>
                {key.expiresAt ? (
                  <Timestamp
                    date={key.expiresAt}
                    format={{ dateStyle: "medium" }}
                  />
                ) : (
                  m.admin_api_key_expiry_never()
                )}
              </TableCell>
              <TableCell>
                <Timestamp
                  date={key.createdAt}
                  format={{ dateStyle: "medium" }}
                />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <EditApiKeyDialog apiKey={key} />
                  <DeleteApiKey id={key.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
