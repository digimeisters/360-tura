import { createClient } from '@supabase/supabase-js';

// Brojač otvaranja tura na početnoj se pojavljuje tek od ovog broja -
// "ture su otvorene 12 puta" bi radilo protiv nas, a ne za nas.
export const PUBLIC_OPENS_THRESHOLD = 500;

/**
 * Koliko puta su ture otvorene (događaj "open" iz analitike, botovi su već
 * odbačeni u /api/track), zaokruženo nadole na stotinu. Vraća null dok broj
 * ne pređe PUBLIC_OPENS_THRESHOLD ili ako čitanje ne uspe - tada se na
 * strani ništa ne prikazuje.
 *
 * tour_events čita samo service role (RLS), zato ovo radi isključivo na
 * serveru. Početna je statična i osvežava se na sat, pa je to jedan upit na
 * sat, a ne po poseti.
 */
export async function getPublicOpenCount(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { count, error } = await supabase
    .from('tour_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'open');

  if (error) {
    console.error('[tourStats] open count:', error.message);
    return null;
  }
  if (count == null || count < PUBLIC_OPENS_THRESHOLD) return null;

  return Math.floor(count / 100) * 100;
}
