import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/@$username/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/@$username/"!</div>
}
