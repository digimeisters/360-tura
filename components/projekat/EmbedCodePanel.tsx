'use client';

import { useState } from 'react';
import { SITE_URL } from '../../app/lib/site';

/**
 * Admin projekta -> "Ugradnja na sajt investitora": gotov kod (iframe +
 * mali skript za visinu) koji investitorov programer nalepi na stranu
 * projekta. Visinu javlja components/projekat/EmbedAutoHeight.tsx; skript
 * prima poruku samo sa našeg domena i samo za ovaj projekat.
 */
export default function EmbedCodePanel({ slug, title, published }: { slug: string; title: string; published: boolean }) {
  const [copied, setCopied] = useState(false);
  const origin = SITE_URL.replace(/\/+$/, '');
  const src = `${origin}/novogradnja/${slug}/ugradnja`;
  const frameId = `k360-${slug}`;
  const code = `<iframe id="${frameId}" src="${src}" title="${title.replace(/"/g, '&quot;')} - izbor stana" style="width:100%;height:900px;border:0;display:block" loading="lazy"></iframe>
<script>
window.addEventListener('message', function (e) {
  if (e.origin !== '${origin}' || !e.data || e.data.type !== 'k360-height' || e.data.slug !== '${slug}') return;
  document.getElementById('${frameId}').style.height = e.data.height + 'px';
});
</script>`;

  return (
    <section className="pa-card">
      <h2>Ugradnja na sajt investitora</h2>
      <p className="pa-hint">
        Izbor stana na sajtu investitora - bez našeg menija i podnožja, sa istim podacima. Kad prodaja promeni status ili cenu, menja se i
        tamo. Upit sa njegovog sajta stiže na Telegram sa oznakom „Poslato sa sajta investitora“.
      </p>
      {!published ? (
        <div className="pa-empty">Kod za ugradnju radi tek kad je projekat objavljen.</div>
      ) : (
        <>
          <p className="pa-hint" style={{ margin: '0 0 8px' }}>
            Pošaljite ovaj kod programeru investitora - nalepi ga na stranu projekta, tamo gde treba da stoji izbor stana. Visina se
            podešava sama.
          </p>
          <pre
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0
            }}
          >
            {code}
          </pre>
          <div className="pa-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="pa-btn is-primary"
              onClick={async () => {
                await navigator.clipboard?.writeText(code).catch(() => undefined);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
              }}
            >
              {copied ? '✓ Kopirano' : 'Kopiraj kod'}
            </button>
            <a className="pa-btn" href={`/novogradnja/${slug}/ugradnja`} target="_blank" rel="noreferrer">
              Kako izgleda ugrađeno ↗
            </a>
          </div>
        </>
      )}
    </section>
  );
}
