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
        'Bez vremenskog ograničenja — link ostaje živ trajno. Kada se nekretnina proda, izda ili je privremeno pauzirate, samo nam javite da promenimo status: umesto ture, posetilac vidi kratku poruku (npr. "Ova nekretnina je izdata"), a ime agencije i telefon ostaju vidljivi, tako da vas i dalje mogu kontaktirati za druge nekretnine.'
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
    },
    {
      question: 'Mora li kupac da zna da se snalazi u 360° turi?',
      answer:
        'Ne mora. Na početku ture bira jedno od dva: „Automatsko vođenje“, gde ga vodič sam provede kroz sve prostorije i ispriča šta se gde nalazi — dovoljno je da gleda i sluša; ili „Istražite sami“, ako voli da razgleda svojim tempom. Vođenje može da prekine u svakom trenutku i nastavi sam.'
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
        'With no time limit — the link stays live permanently. Once the property is sold, rented, or you pause it, just let us know to update its status: instead of the tour, visitors see a short notice (e.g. "This property has been rented"), while your agency name and phone number stay visible, so they can still reach you about other properties.'
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
    },
    {
      question: 'Does the buyer need to know how to use a 360° tour?',
      answer:
        'No. At the start of the tour they pick one of two options: “Guided tour”, where the guide walks them through every room and explains what is where — all they do is watch and listen; or “Explore on your own”, if they prefer their own pace. They can stop the guided walkthrough at any point and carry on by themselves.'
    }
  ]
};
