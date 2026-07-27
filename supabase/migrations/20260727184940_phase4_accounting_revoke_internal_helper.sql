-- The earlier `revoke … from anon, authenticated` left the default PUBLIC
-- grant in place, so the internal voucher builder was still callable over
-- PostgREST. Revoke from PUBLIC — only the definer functions may use it.
revoke all on function public._acc_create_posted_voucher(text, text, date, text, text, text, uuid, jsonb) from public;
