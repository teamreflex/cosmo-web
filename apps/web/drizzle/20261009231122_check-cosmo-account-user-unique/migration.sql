-- a user may link one COSMO account; refuse the release while any user has more than one
DO $$
DECLARE duplicates text;
BEGIN
  SELECT string_agg(user_id || ' (' || n || ')', ', ' ORDER BY user_id) INTO duplicates
  FROM (SELECT user_id, count(*) AS n FROM cosmo_account WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1) AS d;
  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'cosmo_account.user_id is linked more than once: %', duplicates
      USING HINT = 'Resolve the extra COSMO links before adding UNIQUE (cosmo_account.user_id).';
  END IF;
END $$;
