import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { m } from "@/i18n/messages";
import { useLocation } from "@tanstack/react-router";
import { getItems } from "./sidebar";

export default function AdminBreadcrumbs() {
  const location = useLocation();
  const items = getItems();
  const match = items.find((i) => i.url === location.pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/admin">{m.common_admin()}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        {match !== undefined && (
          <BreadcrumbItem>
            <BreadcrumbPage>{match.title}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
