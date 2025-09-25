import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/@$username/trades')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/@$username/trades"!</div>
}
