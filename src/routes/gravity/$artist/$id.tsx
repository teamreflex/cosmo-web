import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gravity/$artist/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/gravity/$artist/$id"!</div>
}
