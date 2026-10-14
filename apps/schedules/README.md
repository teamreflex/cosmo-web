# schedules

Scheduled tasks and the workers for the web app's job queues. `bun run task <name>` runs one once.

## Tasks

| Task                          | Schedule            | Purpose                                                                 |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `drain-outbox`                | Every minute        | Applies indexed transfers to lists, pins, binders and trades            |
| `trade-timers`                | Every minute        | Times out or completes accepted trades past their deadline              |
| `sync-market-stats`           | Every minute        | Copies each listed collection's floor and listing count for `/market`   |
| `apply-serial-confirmations`  | Every 5 minutes     | Re-estimates collections whose staff-confirmed serials don't match yet  |
| `sync-gravities`              | Every 30 minutes    | Syncs gravities and poll candidates from COSMO                          |
| `clear-objekt-stats`          | Hourly, on the hour | Clears the cached objekt stats                                          |
| `chat-retention`              | Hourly, at :15      | Blanks chat messages 14 days after their trade ends                     |
| `sync-collection-price-stats` | Every 4 hours       | Recomputes collection median prices and records the day's price history |
| `sync-fx-rates`               | Every 12 hours      | Fetches USD exchange rates                                              |
| `sync-members`                | Daily at 04:00 UTC  | Syncs the member list from COSMO                                        |
| `recompute-serials`           | Daily at 08:00 NZT  | Re-estimates serials in collections with an objekt minted that day      |

## Queues

| Queue                 | Purpose                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `trade-notifications` | Notifies users whose trade lists match collections just added to someone's trade-active list |
