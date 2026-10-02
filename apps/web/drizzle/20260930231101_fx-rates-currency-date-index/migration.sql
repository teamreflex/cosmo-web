DROP INDEX "fx_rates_currency_idx";--> statement-breakpoint
CREATE INDEX "fx_rates_currency_date_idx" ON "fx_rates" ("currency","date" DESC);