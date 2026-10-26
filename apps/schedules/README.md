# schedules

Scheduled tasks and the workers for the web app's job queues, in one Effect process. Its most important task, `drain-outbox`, applies on-chain transfers from the indexer to the web database: lists, pins, binders and trades. Rules for working here are in [`CLAUDE.md`](CLAUDE.md).

## The outbox drain

```
  apps/indexer processor               indexer DB
  transfer (not a mint) ---append--->  transfer row + list_event_outbox row
  transferability change --append--->  list_event_outbox row
                                       (bigserial id; a hot-block rollback removes the
                                        transfer row, never the outbox row)

  apps/schedules drain-outbox: every minute, looping while a batch is full (1000)
  +-- web DB transaction ------------------------------------------------------+
  | 1. lock list_drain_cursor 'outbox-drain' FOR UPDATE -> seq                 |
  | 2. read outbox id > seq, limit 1000   <--------------- indexer DB          |
  |    left join transfer.hash (null = rolled back)                            |
  | 3. clear list entries, pins, binder slots of the transferred tokens        |
  | 4. applyTrades: users -> live trades -> pending offers -> listings         |
  |    (decisions: docs/trades/drain.md)                                       |
  | 5. seq = last id, chain_time = greatest(chain_time, newest timestamp)      |
  +-------------------------------- COMMIT ------------------------------------+
        | after commit, not retried if Redis fails
        v
  Redis DEL pin cache keys;  PUBLISH trade-events per touched trade ---> apps/chat
  indexer: purge outbox rows older than 7 days AND id <= seq
```

`chain_time` is the watermark that `trade-timers` judges trade deadlines against.

## Tasks

| Task                          | Schedule                        | Purpose                                                                                     |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `drain-outbox`                | Every minute                    | Applies indexed transfers to lists, pins, binders and trades                                |
| `trade-timers`                | Every minute                    | Expires pending offers, declines offers on closed listings, ends trades past their deadline |
| `sync-market-stats`           | Every minute                    | Copies each listed collection's floor and listing count for `/market`                       |
| `apply-serial-confirmations`  | Every 5 minutes                 | Re-estimates collections whose staff-confirmed serials don't match yet                      |
| `sync-gravities`              | Every 30 minutes                | Stores new gravities and their poll candidates from COSMO                                   |
| `clear-objekt-stats`          | Hourly, on the hour             | Clears the cached objekt stats                                                              |
| `chat-retention`              | Hourly, at :15                  | Blanks chat messages 14 days after their trade ends                                         |
| `sync-collection-price-stats` | Every 4 hours                   | Recomputes collection median prices and records the day's price history                     |
| `sync-fx-rates`               | Every 12 hours                  | Fetches USD exchange rates                                                                  |
| `sync-members`                | Daily at 04:00 UTC              | Syncs the member list from COSMO                                                            |
| `recompute-serials`           | Daily at 08:00 Pacific/Auckland | Re-estimates serials in collections with an objekt minted in the last day                   |

## Queues

| Queue                 | Purpose                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `trade-notifications` | Notifies users whose trade lists match collections just added to someone's trade-active list |

## Environment

Every variable is required at boot; a missing one stops every task.

| Variable               | Used for                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `WEB_DATABASE_URL`     | the web database                                                |
| `INDEXER_DATABASE_URL` | the indexer database                                            |
| `REDIS_URL`            | job queues, caches and the `trade-events` channel               |
| `COSMO_KEY`            | the COSMO encryption key, used while Redis holds no `cosmo-key` |
| `EXCHANGERATE_API_KEY` | `sync-fx-rates`                                                 |

## Running

- `turbo dev --filter schedules` runs it in watch mode, with the docker services.
- `bun run task <name>` runs one task once and exits.
- `bun run simulate` writes fake chain activity for the drain; see [`CLAUDE.md`](CLAUDE.md#simulating-the-chain).
- `bun test` runs the outbox planner's tests.
