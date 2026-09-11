import { CONTACT } from './site';
import type { HomeLang } from './homeCopy';

export type FaqItem = {
  question: string;
  answer: string;
};

// Česta pitanja sa početne strane. Isti tekst ide i u podatke za pretraživače
// (FAQPage u JSON-LD), pa ga menjati samo ovde - u oba jezika.
export const HOME_FAQ: Record<HomeLang, readonly FaqItem[]> = {
  sr: [
    {
      question: 'Da li neko mora da bude u stanu tokom snimanja?',
      answer:
        'Dovoljno je da nam neko otvori stan. Snimanje traje 30–60 minuta, a tokom snimanja u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
    },
    {
      question: 'Koliko dugo je tura dostupna online?',
      answer:
        'Bez vremenskog ograničenja. Tura ostaje online dok ne zatražite da je skinemo, na primer kada se nekretnina proda ili izda.'
    },
    {
      question: 'Kako da postavim turu na oglas?',
      answer:
        'Dobijate link ture koji možete da nalepite u opis oglasa na bilo kom portalu ili da ga pošaljete kupcu porukom (Viber, WhatsApp, mejl). Za sajt agencije dobijate i gotov kod za ugradnju, pa se tura otvara direktno na stranici nekretnine.'
    },
    {
      question: 'Šta ako se nešto u stanu promeni posle snimanja?',
      answer:
        'Ponovo snimamo samo prostorije koje su se promenile i menjamo ih u postojećoj turi. Link ostaje isti, pa na oglasu ne morate ništa da menjate. Cenu dodatnog snimanja dogovaramo prema broju prostorija.'
    },
    {
      question: 'Gde snimate?',
      answer: `${CONTACT.serviceArea}. Za druge gradove dolazak je moguć po dogovoru.`
    },
    {
      question: 'Da li tura radi na telefonu?',
      answer:
        'Da. Tura se otvara u pretraživaču na telefonu, tabletu i računaru, bez preuzimanja aplikacije. Na telefonu prostor možete da razgledate i pomeranjem samog telefona.'
    }
  ],
  en: [
    {
      question: 'Does someone need to be at the property during the shoot?',
      answer:
        'Someone just needs to let us in. The shoot takes 30–60 minutes, and nobody should be in the room while we shoot, because the 360° camera sees the whole space. It helps to switch the lights on, open the curtains and put personal items away beforehand.'
    },
    {
      question: 'How long does the tour stay online?',
      answer:
        'With no time limit. The tour stays online until you ask us to take it down, for example once the property is sold or rented.'
    },
    {
      question: 'How do I add the tour to my listing?',
      answer:
        'You get a link to the tour that you can paste into the listing description on any portal or send to a buyer by message (Viber, WhatsApp, email). For an agency website you also get a ready-made embed code, so the tour opens right on the property page.'
    },
    {
      question: 'What if something in the apartment changes after the shoot?',
      answer:
        'We reshoot only the rooms that changed and replace them in the existing tour. The link stays the same, so you don’t need to change anything on the listing. The price of the extra shoot depends on the number of rooms.'
    },
    {
      question: 'Where do you shoot?',
      answer:
        'In Kragujevac and the surrounding area. We can also travel to other cities by arrangement.'
    },
    {
      question: 'Does the tour work on a phone?',
      answer:
        'Yes. The tour opens in the browser on a phone, tablet or computer, with no app to download. On a phone you can also look around the space simply by moving the phone.'
    }
  ]
};
