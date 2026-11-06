import { useCallback, useRef, useState } from 'react';

export type AssistantMessage = {
  role: 'user' | 'ai';
  text: string;
  /** Odgovor je iz podataka ture. false = nema podatka (ili greška) - nudi se poruka agentu. */
  known?: boolean;
  /** Pitanje na koje se odgovor odnosi - ide u poruku agentu. */
  question?: string;
};

type Labels = { error: string; rateLimited: string };

/** Koliko poslednjih poruka ide serveru kao tok razgovora (server dodatno skraćuje). */
const HISTORY_SENT = 8;

/** Najduže čekanje odgovora u chatu pre nego što se ponudi poruka agentu. */
const CLIENT_TIMEOUT_MS = 25_000;

/**
 * Razgovor sa asistentom iz modula "Pitanja" (ruta /api/tour-assistant).
 * Drži poruke i stanje čekanja; tekst grešaka stiže spolja (prevodi), da
 * i greška izgleda kao odgovor sa dugmetom "Pišite agentu".
 */
export function useTourAssistant(slug: string | undefined, lang: string, labels: Labels) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  // Ref umesto stanja za zaštitu od duplog slanja: dva brza dodira ne smeju da pošalju dva poziva.
  const busyRef = useRef(false);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!slug || !question || busyRef.current) return;
      busyRef.current = true;

      const history = messages.slice(-HISTORY_SENT).map((m) => ({ role: m.role, text: m.text }));
      setMessages((prev) => [...prev, { role: 'user', text: question }]);
      setLoading(true);

      const fail = (text: string) =>
        setMessages((prev) => [...prev, { role: 'ai', text, known: false, question }]);

      // Ruta sama staje najkasnije oko 20 s (maxDuration 30); ako mreža ili
      // server zaglave, kupac ne sme da gleda tačkice u nedogled - posle roka
      // dobija istu poruku kao kod greške, sa dugmetom "Pišite agentu".
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

      try {
        const res = await fetch('/api/tour-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, question, lang, history }),
          signal: controller.signal
        });
        if (res.status === 429) {
          fail(labels.rateLimited);
          return;
        }
        const json = (await res.json().catch(() => null)) as { success?: boolean; answer?: string; known?: boolean } | null;
        if (!res.ok || !json?.success || !json.answer) {
          fail(labels.error);
          return;
        }
        setMessages((prev) => [...prev, { role: 'ai', text: json.answer!, known: json.known === true, question }]);
      } catch {
        fail(labels.error);
      } finally {
        clearTimeout(timer);
        busyRef.current = false;
        setLoading(false);
      }
    },
    [slug, lang, messages, labels.error, labels.rateLimited]
  );

  return { messages, loading, send };
}
