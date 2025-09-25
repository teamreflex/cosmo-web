import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/bands')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/bands"!</div>
}
