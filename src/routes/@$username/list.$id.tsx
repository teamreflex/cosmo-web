import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/@$username/list/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/@$username/list/$id"!</div>
}
