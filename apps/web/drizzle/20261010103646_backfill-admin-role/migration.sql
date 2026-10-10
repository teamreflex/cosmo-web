-- staff roles replace is_admin; the column stays until a follow-up release
UPDATE "user" SET "role" = 'admin' WHERE "is_admin";