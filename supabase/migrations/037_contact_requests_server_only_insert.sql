-- Pregled koda 18. 10. 2026: upiti stižu samo preko /api/contact,
-- /api/viewing-request i /api/tour-capture (service role, ograničen broj
-- zahteva po IP-u). Direktan INSERT anon ključem kroz REST je zaobilazio to
-- ograničenje - pravilo se uklanja; service role ga ionako ne koristi.
drop policy if exists "Anon can submit contact requests" on public.contact_requests;
