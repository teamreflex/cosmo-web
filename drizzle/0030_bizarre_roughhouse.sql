-- create trigger function to track username changes
CREATE OR REPLACE FUNCTION track_cosmo_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- check if username actually changed
    IF OLD.username IS DISTINCT FROM NEW.username THEN
        -- insert the address and new username into cosmo_account_changes
        INSERT INTO cosmo_account_changes (address, username)
        VALUES (NEW.address, NEW.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- create trigger on cosmo_account table
CREATE TRIGGER cosmo_account_username_change_trigger
AFTER UPDATE OF username ON cosmo_account
FOR EACH ROW
EXECUTE FUNCTION track_cosmo_id_changes();