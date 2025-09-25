import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/metadata')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/metadata"!</div>
}
