'use client';

import { useEffect } from 'react';

/**
 * Jezik cele strane (<html lang>) za engleske strane. Root layout je jedan za
 * ceo sajt i piše lang="sr"; sadržaj engleskih strana je već u <div lang="en">,
 * a ovo ispravlja i oznaku cele strane (čitači ekrana, prevodilac pregledača).
 * Pri odlasku sa strane vraća prethodni jezik.
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.lang;
    html.lang = lang;
    return () => {
      html.lang = prev;
    };
  }, [lang]);
  return null;
}
