-- Uvod ture (vlasnik, 17. 10. 2026): kratak glas na početku automatskog
-- vodiča, dok posetilac "dolazi sa mape" do nekretnine (TourIntroOverlay).
-- AI ga piše iz osnovnih podataka ture (/api/ai/tour-intro), agent ga ispravi
-- pa se prevodi i snima. Naracije soba (rooms.establish_i18n) se ne diraju.
alter table public.tours
  add column if not exists intro_i18n jsonb,
  add column if not exists intro_audio_i18n jsonb;

comment on column public.tours.intro_i18n is 'Tekst uvoda po jeziku {sr,en,de,ru} - izgovara se, ne prikazuje.';
comment on column public.tours.intro_audio_i18n is 'URL snimljenog glasa uvoda po jeziku (kanta narrations, {slug}/intro-{lang}.mp3).';
