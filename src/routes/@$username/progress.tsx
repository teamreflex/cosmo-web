import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/@$username/progress')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/@$username/progress"!</div>
}
