import { CONTACT } from './site';
import { PRICE_TIERS, displayPackagePrice, displayPerProperty, formatAmount, type PriceLang } from './pricing';
import type { HomeLang } from './homeCopy';

// Redovne cene za jednu nekretninu i najniža cena po nekretnini (10+ mesečno),
// iz pricing.ts - odgovor "Koliko košta" se tako ne razilazi sa cenovnikom.
// Namerno bez promo cene: ovaj tekst se ne osvežava kad promocija istekne.
function priceFacts(lang: PriceLang) {
  return {
    basic: formatAmount(displayPackagePrice(1, 'basic', lang), lang),
    premium: formatAmount(displayPackagePrice(1, 'premium', lang), lang),
    lowest: formatAmount(displayPerProperty(PRICE_TIERS[PRICE_TIERS.length - 1], 'basic', lang), lang)
  };
}
const SR_PRICES = priceFacts('sr');
const EN_PRICES = priceFacts('en');

export type FaqItem = {
  question: string;
  answer: string;
};

// Česta pitanja sa početne strane. Isti tekst ide i u podatke za pretraživače
// (FAQPage u JSON-LD), pa ga menjati samo ovde - u oba jezika.
export const HOME_FAQ: Record<HomeLang, readonly FaqItem[]> = {
  sr: [
    {
      question: 'Šta je 360° virtuelna tura nekretnine?',
      answer:
        'To je interaktivni obilazak nekretnine iz panoramskih snimaka: kupac na telefonu ili računaru prelazi iz prostorije u prostoriju i razgleda svaki ugao, kao da je unutra. Naše ture imaju i audio vodič na više jezika, tlocrt, odgovore na česta pitanja i dugme za zakazivanje razgledanja.'
    },
    {
      question: 'Koliko košta 360° tura nekretnine u Kragujevcu?',
      answer: `Za jednu nekretninu, 360° tura sa HDR fotografijama košta ${SR_PRICES.basic} u Osnovnom paketu (srpski + jedan jezik po izboru, isporuka za 48h) i ${SR_PRICES.premium} u Premium paketu (sva 4 jezika i tlocrt, isporuka za 24h). Agencijama sa više nekretnina mesečno cena pada do ${SR_PRICES.lowest} po nekretnini. Aktuelni popusti su u cenovniku.`
    },
    {
      question: 'Da li neko mora da bude prisutan tokom snimanja?',
      answer:
        'Dovoljno je da nam neko otvori vrata. Snimanje traje 30–60 minuta i tokom njega u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
    },
    {
      question: 'Koliko dugo je tura dostupna online?',
      answer:
        'Bez vremenskog ograničenja — link trajno ostaje aktivan. Kada se nekretnina proda, izda ili je privremeno pauzirate, javite nam da promenimo status. Posetilac tada umesto ture vidi kratku poruku, na primer „Ova nekretnina je izdata“, a ime agencije i telefon ostaju vidljivi — pa vas i dalje može pozvati za neku drugu nekretninu.'
    },
    {
      question: 'Kako da postavim turu na oglas?',
      answer:
        'Dobijate link ka turi i ubacite ga u opis oglasa na bilo kom portalu, ili ga pošaljete kupcu porukom (Viber, WhatsApp, mejl). Za sajt agencije dobijate i gotov kod za ugradnju, pa se tura otvara direktno na stranici nekretnine.'
    },
    {
      question: 'Šta ako se nešto u prostoru promeni posle snimanja?',
      answer:
        'Ponovo snimamo samo prostorije koje su se promenile i zamenjujemo ih u postojećoj turi. Link ostaje isti, pa na oglasu ne morate ništa da menjate. Cenu dodatnog snimanja dogovaramo prema broju prostorija.'
    },
    {
      question: 'Gde snimate?',
      answer: `${CONTACT.serviceArea}. Za druge gradove dolazimo po dogovoru.`
    },
    {
      question: 'Mora li kupac da zna da se snalazi u 360° turi?',
      answer:
        'Ne mora. Na početku bira jedno od dva. „Automatsko vođenje“ — vodič ga provede kroz sve prostorije i ispriča šta se gde nalazi, a on samo gleda i sluša. Ili „Istražite sami“, ako voli da razgleda svojim tempom. Vođenje može da prekine u svakom trenutku i nastavi sam.'
    }
  ],
  en: [
    {
      question: 'What is a 360° virtual property tour?',
      answer:
        'It is an interactive walkthrough built from panoramic shots: on a phone or computer the buyer moves from room to room and looks around every corner, as if standing inside. Our tours also include an audio guide in several languages, a floor plan, answers to common questions and a button to book a viewing.'
    },
    {
      question: 'How much does a 360° property tour cost in Kragujevac?',
      answer: `For one property, a 360° tour with HDR photos costs ${EN_PRICES.basic} in the Basic package (Serbian + one language of your choice, delivered within 48h) and ${EN_PRICES.premium} in the Premium package (all 4 languages and a floor plan, delivered within 24h). For agencies with more properties a month, the price drops to ${EN_PRICES.lowest} per property. Current discounts are shown in the price list.`
    },
    {
      question: 'Does someone need to be at the property during the shoot?',
      answer:
        'Someone just needs to let us in. The shoot takes 30–60 minutes, and nobody should be in the room while we shoot, because the 360° camera sees the whole space. It helps to switch the lights on, open the curtains and put personal items away beforehand.'
    },
    {
      question: 'How long does the tour stay online?',
      answer:
        'With no time limit — the link stays live permanently. Once the property is sold, rented, or you pause it, just let us know to update its status: instead of the tour, visitors see a short notice (e.g. “This property has been rented”), while your agency name and phone number stay visible, so they can still reach you about other properties.'
    },
    {
      question: 'How do I add the tour to my listing?',
      answer:
        'You get a link to the tour that you can paste into the listing description on any portal or send to a buyer by message (Viber, WhatsApp, email). For an agency website you also get a ready-made embed code, so the tour opens right on the property page.'
    },
    {
      question: 'What if something at the property changes after the shoot?',
      answer:
        'We reshoot only the rooms that changed and replace them in the existing tour. The link stays the same, so you don’t need to change anything on the listing. The price of the extra shoot depends on the number of rooms.'
    },
    {
      question: 'Where do you shoot?',
      answer:
        'In Kragujevac and the surrounding area. We can also travel to other cities by arrangement.'
    },
    {
      question: 'Does the buyer need to know how to use a 360° tour?',
      answer:
        'No. At the start of the tour they pick one of two options: “Guided tour”, where the guide walks them through every room and explains what is where — all they do is watch and listen; or “Explore on your own”, if they prefer their own pace. They can stop the guided walkthrough at any point and carry on by themselves.'
    }
  ]
};
