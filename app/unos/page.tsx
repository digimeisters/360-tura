'use client';

import { useEffect, useState } from 'react';
import { FORM, FormThemeStyle, formBtnStyle } from '../lib/formTheme';
import { Logo } from '../tour/[slug]/Logo';

type Category = 'rent' | 'sale' | 'booking';

const DRAFT_KEY = 'k360_unos_draft';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'Srpski', label: 'Srpski' },
  { code: 'Engleski', label: 'Engleski' },
  { code: 'Nemački', label: 'Nemački' },
  { code: 'Ruski', label: 'Ruski' }
];

const CATEGORY_LABELS: Record<Category, string> = {
  rent: 'Izdavanje',
  sale: 'Prodaja',
  booking: 'Stan na dan'
};

const PROPERTY_TYPES = ['Stan', 'Kuća', 'Poslovni prostor', 'Vikendica', 'Apartman'] as const;

/**
 * Struktura zavisi od tipa nekretnine - "dvoiposoban" nema smisla za lokal,
 * a "HoReCa" nema smisla za stan. Zato se drugi meni puni prema prvom.
 *
 * Zapisuje se kao slobodan tekst u odgovore ("Struktura nekretnine"), pa se
 * lista ovde može proširiti bez ijedne izmene u bazi.
 */
const STRUCTURES: Record<string, string[]> = {
  Stan: [
    'Garsonjera',
    'Jednosoban (1.0)',
    'Jednoiposoban (1.5)',
    'Dvosoban (2.0)',
    'Dvoiposoban (2.5)',
    'Trosoban (3.0)',
    'Troiposoban (3.5)',
    'Četvorosoban (4.0)',
    'Petosoban i veći'
  ],
  // Apartman je po strukturi stan - razlikuje se samo namena (stan na dan).
  Apartman: [
    'Garsonjera',
    'Jednosoban (1.0)',
    'Jednoiposoban (1.5)',
    'Dvosoban (2.0)',
    'Dvoiposoban (2.5)',
    'Trosoban (3.0)',
    'Troiposoban (3.5)',
    'Četvorosoban (4.0)',
    'Petosoban i veći'
  ],
  Kuća: [
    'Prizemna (Pr)',
    'Spratna (Pr+1)',
    'Višespratna (Pr+2 i više)',
    'Dupleks / mezonet u kući'
  ],
  'Poslovni prostor': [
    'Maloprodajni / trgovački',
    'Uslužni / kancelarijski',
    'Ugostiteljski (HoReCa)'
  ],
  Vikendica: ['Montažna', 'Zidana', 'Renovirana stara / etno kuća']
};

/**
 * Naselja po gradu, za predlog dok agent kuca. Ključ je grad malim slovima,
 * jer se poredi sa onim što je upisano u polju "Grad".
 *
 * Namerno je `datalist`, a ne `select`: grad koji ovde nema svoju listu i
 * dalje mora da primi upisano naselje. Novi grad se dodaje kao još jedan
 * ključ, bez ikakve izmene u formi.
 */
/** Poslednja stavka u meniju naselja - otvara polje za ručni unos. */
const OTHER_NEIGHBOURHOOD = '__drugo__';

const NEIGHBOURHOODS: Record<string, string[]> = {
  kragujevac: [
    'Aerodrom',
    'Bagdala',
    'Bagremar',
    'Beloševac',
    'Bresnica',
    'Centar',
    'Centar preko Lepenice',
    'Centralna radionica',
    'Denino brdo',
    'Erdeč',
    'Erdoglija',
    'Grošnica',
    'Ilićevo',
    'Ilina Voda',
    'Jabučar',
    'Kolonija',
    'Korićani',
    'Košutnjak',
    'Kozujevo',
    'Ljubine livade',
    'Mala Vaga',
    'Male Pčelice',
    'Maršić',
    'Metino brdo',
    'Ozon',
    'Paliluje',
    'Petrovac',
    'Pivara',
    'Potok',
    'Stanovo',
    'Sušica',
    'Šest Topola',
    'Šumarice',
    'Šumski Raj',
    'Vašnjak',
    'Vinogradi',
    'Zvezda',
    'Ždraljica'
  ]
};

export default function UnosPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<string[]>(['Srpski']);
  const [category, setCategory] = useState<Category>('rent');
  const [floorplan, setFloorplan] = useState<File | null>(null);
  const [pickedOther, setPickedOther] = useState(false);
  const [code, setCode] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ slug: string; languages: string[] } | null>(null);

  // Upitnik je dugačak - ako se tab zatvori ili osveži, ne sme da propadne
  // sve otkucano. Kod za slanje se namerno ne čuva.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.values) setValues(draft.values);
      if (draft.languages) setLanguages(draft.languages);
      if (draft.category) setCategory(draft.category);
    } catch {
      // Neispravan ili nedostupan draft se prosto ignoriše.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, languages, category }));
    } catch {
      // Privatni režim zabranjuje upis - forma i dalje radi, samo bez nacrta.
    }
  }, [values, languages, category]);

  const set = (key: string) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const propertyType = values['Tip nekretnine'] || 'Stan';
  const structureOptions = STRUCTURES[propertyType] || [];
  // Posle promene tipa stara struktura može da ne postoji u novoj listi -
  // tada se meni vraća na prazno, da agent ne pošalje "HoReCa" za stan.
  const savedStructure = values['Struktura nekretnine'] || '';
  const structure = structureOptions.includes(savedStructure) ? savedStructure : '';

  const neighbourhoods = NEIGHBOURHOODS[(values['Grad'] || '').trim().toLowerCase()] || [];
  const neighbourhood = values['Naselje'] || '';
  // Grad ima svoja naselja -> zatvoren meni. Naselje koje nije na spisku se
  // i dalje upisuje rukom, preko poslednje stavke u meniju.
  const customNeighbourhood =
    pickedOther || (neighbourhood !== '' && !neighbourhoods.includes(neighbourhood));

  const changeNeighbourhood = (e: { target: { value: string } }) => {
    const picked = e.target.value;
    if (picked === OTHER_NEIGHBOURHOOD) {
      setPickedOther(true);
      setValues((prev) => ({ ...prev, Naselje: '' }));
      return;
    }
    setPickedOther(false);
    setValues((prev) => ({ ...prev, Naselje: picked }));
  };

  const changePropertyType = (e: { target: { value: string } }) => {
    const type = e.target.value;
    setValues((prev) => {
      const next: Record<string, string> = { ...prev, 'Tip nekretnine': type };
      const options = STRUCTURES[type] || [];
      if (!options.includes(next['Struktura nekretnine'] || '')) {
        next['Struktura nekretnine'] = '';
      }
      return next;
    });
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (languages.length === 0) {
      setError('Izaberite bar jedan jezik.');
      return;
    }

    setSending(true);
    try {
      const answers: Record<string, string> = {
        ...values,
        // Meniji koje agent nije dirao ostaju van `values`, pa se njihove
        // podrazumevane vrednosti ovde upisuju eksplicitno.
        'Tip nekretnine': propertyType,
        'Struktura nekretnine': structure,
        'Kategorija oglasa': CATEGORY_LABELS[category],
        'Jezici za implementaciju': languages.join(', ')
      };

      const body = new FormData();
      body.append('accessCode', code);
      body.append('answers', JSON.stringify(answers));
      if (floorplan) body.append('floorplan', floorplan);

      const res = await fetch('/api/unos', { method: 'POST', body });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Slanje nije uspelo.');
        return;
      }

      // Tek posle uspeha se nacrt briše.
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // nebitno
      }
      setDone({ slug: json.slug, languages: json.languages || [] });
    } catch {
      setError('Nema veze sa serverom. Podaci su sačuvani, pokušajte ponovo.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <main className="k-form" style={pageStyle}>
        <FormThemeStyle />
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <Logo />
          <h1 style={{ fontSize: '20px', margin: '10px 0 0', fontFamily: FORM.fontDisplay }}>
            Nekretnina je poslata
          </h1>
          <p style={{ margin: 0, color: FORM.textSecondary, fontSize: '14.5px', lineHeight: 1.6 }}>
            Tura je kreirana, tekst je pripremljen na {done.languages.length} jezika. Sledi
            snimanje i postavljanje panorama.
          </p>
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              background: FORM.surfaceAlt,
              border: '1px solid ' + FORM.border,
              borderRadius: '8px',
              padding: '10px',
              wordBreak: 'break-all'
            }}
          >
            kvadrat360.com/tour/{done.slug}
          </code>
          <button
            onClick={() => {
              setDone(null);
              setValues({});
              setFloorplan(null);
              setPickedOther(false);
              setCode('');
              setLanguages(['Srpski']);
              setCategory('rent');
            }}
            style={primaryBtn}
          >
            Unesi još jednu nekretninu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="k-form" style={pageStyle}>
        <FormThemeStyle />
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '720px' }}>
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <Logo />
          <h1 style={{ fontSize: '22px', margin: '8px 0 0', fontFamily: FORM.fontDisplay }}>
            Unos nekretnine
          </h1>
          <p style={{ margin: 0, color: FORM.textSecondary, fontSize: '14.5px', lineHeight: 1.6 }}>
            Popunite osnovne podatke o nekretnini — sami, ili zajedno sa nama, telefonom. Na
            osnovu njih se automatski pripremaju opis i odgovori na česta pitanja, na svim
            izabranim jezicima.
          </p>
          <p
            style={{
              margin: 0,
              padding: '10px 12px',
              background: FORM.accentSoft,
              border: '1px solid ' + FORM.border,
              borderRadius: '10px',
              fontSize: '13.5px',
              color: FORM.textPrimary
            }}
          >
            Za slanje na kraju je potreban <strong>kod</strong> koji ste dobili od Kvadrat360.
          </p>
        </div>

        <Section title="Osnovni podaci">
          <Field label="Tip nekretnine" required>
            <select id="tip" value={propertyType} onChange={changePropertyType} style={inputStyle}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Struktura nekretnine"
            required
            hint="Ponuđene strukture se menjaju prema izabranom tipu nekretnine."
          >
            <select
              id="struktura"
              value={structure}
              onChange={set('Struktura nekretnine')}
              required
              style={inputStyle}
            >
              <option value="">Izaberite strukturu</option>
              {structureOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Naslov oglasa" required hint="Kratko i jasno — ovo klijent vidi kad podeli turu.">
            <input
              id="naslov"
              value={values['Naslov oglasa'] || ''}
              onChange={set('Naslov oglasa')}
              placeholder="npr. Dvosoban stan 58 m² — Vračar"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Adresa nekretnine" required>
            <input
              id="adresa"
              value={values['Adresa nekretnine'] || ''}
              onChange={set('Adresa nekretnine')}
              placeholder="Ulica i broj, grad"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Grad" required hint="Samo grad, bez ulice i poštanskog broja — po njemu se tura nalazi na spisku svih tura.">
            <input
              id="grad"
              value={values['Grad'] || ''}
              onChange={set('Grad')}
              placeholder="npr. Kragujevac"
              list="gradovi"
              required
              style={inputStyle}
            />
            {/* Predlozi da se isti grad ne bi pisao na tri načina - filter na
                /ture grupiše ture po tačnom nazivu. */}
            <datalist id="gradovi">
              {['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Čačak', 'Kraljevo', 'Novi Pazar', 'Zlatibor', 'Kopaonik', 'Wien'].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Naselje"
            hint={
              neighbourhoods.length
                ? 'Naselja se nude prema izabranom gradu. Ako ga nema na spisku, izaberite „Drugo naselje“.'
                : 'Za ovaj grad još nemamo spisak naselja — upišite ga rukom.'
            }
          >
            {/* Grad sa spiskom dobija meni; ostali gradovi ostaju na
                slobodnom unosu, dok im se spisak ne doda. */}
            {neighbourhoods.length > 0 && (
              <select
                id="naselje"
                value={customNeighbourhood ? OTHER_NEIGHBOURHOOD : neighbourhood}
                onChange={changeNeighbourhood}
                style={inputStyle}
              >
                <option value="">Izaberite naselje</option>
                {neighbourhoods.map((n) => (
                  <option key={n}>{n}</option>
                ))}
                <option value={OTHER_NEIGHBOURHOOD}>Drugo naselje…</option>
              </select>
            )}

            {(customNeighbourhood || neighbourhoods.length === 0) && (
              <input
                id={neighbourhoods.length ? 'naselje-drugo' : 'naselje'}
                value={neighbourhood}
                onChange={set('Naselje')}
                placeholder={neighbourhoods[0] ? `npr. ${neighbourhoods[0]}` : 'npr. Centar'}
                style={inputStyle}
              />
            )}
          </Field>

          <Field label="Google Maps embed link" hint="Nije obavezno — mapa se sama postavlja po adresi. Popunite samo ako imate tačan embed link.">
            <input
              id="mapa"
              value={values['Google Maps lokacija'] || ''}
              onChange={set('Google Maps lokacija')}
              placeholder="https://www.google.com/maps/embed?pb=..."
              style={inputStyle}
            />
          </Field>

          <Field label="Kratak opis nekretnine" hint="3–5 rečenica. Ovo se prikazuje u sekciji „Info“.">
            <textarea
              id="opis"
              value={values['Kratak opis nekretnine'] || ''}
              onChange={set('Kratak opis nekretnine')}
              rows={4}
              placeholder="Šta izdvaja ovu nekretninu — orijentacija, sprat, okruženje, nedavna renoviranja..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <Field label="Crtež osnove / tlocrt" hint="Slika tlocrta — JPG, PNG ili WEBP, do 10MB. Može i naknadno.">
            {/* Sopstveno dugme: pregledačevo ("Choose File / No file chosen")
                je uvek na jeziku pregledača, pa je usred srpske forme umelo
                da bude na engleskom. */}
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
              <label htmlFor="tlocrt" style={{ ...formBtnStyle, padding: '6px 14px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                Izaberi sliku
              </label>
              <span
                style={{
                  minWidth: 0,
                  fontSize: '13.5px',
                  color: floorplan ? FORM.textPrimary : FORM.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {floorplan ? floorplan.name : 'Nije izabrana'}
              </span>
              <input
                id="tlocrt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFloorplan(e.target.files?.[0] || null)}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  pointerEvents: 'none'
                }}
              />
            </div>
          </Field>
        </Section>

        <Section title="Oglašivač">
          <Field label="Svojstvo oglašivača" required>
            <select
              id="oglasivac"
              value={values['Oglašivač'] || 'Vlasnik'}
              onChange={set('Oglašivač')}
              style={inputStyle}
            >
              {['Vlasnik', 'Suvlasnik', 'Punomoćnik', 'Agencija za nekretnine', 'Zakonski zastupnik'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field label="Naziv agencije" hint="Ostavite prazno ako oglašava vlasnik.">
            <input
              id="agencija"
              value={values['Naziv agencije'] || ''}
              onChange={set('Naziv agencije')}
              style={inputStyle}
            />
          </Field>

          <Field label="Ime i prezime" required>
            <input
              id="ime"
              value={values['Ime i prezime oglašivača'] || ''}
              onChange={set('Ime i prezime oglašivača')}
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Telefon" required>
            <input
              id="telefon"
              value={values['Telefon oglašivača'] || ''}
              onChange={set('Telefon oglašivača')}
              placeholder="+381 6x xxx xxxx"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="E-mail">
            <input
              id="email"
              type="email"
              value={values['E-mail oglašivača'] || ''}
              onChange={set('E-mail oglašivača')}
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="Vrsta oglasa">
          <Field label="Nekretnina se oglašava kao" required>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{
                    ...formBtnStyle,
                    padding: '9px 16px',
                    fontSize: '13.5px',
                    background: category === c ? FORM.accent : FORM.surface,
                    color: category === c ? '#fff' : FORM.textPrimary,
                    borderColor: category === c ? FORM.accent : FORM.border
                  }}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Jezici ture" required hint="Opis i odgovori se prevode na izabrane jezike.">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {LANGUAGES.map((l) => {
                const on = languages.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    style={{
                      ...formBtnStyle,
                      padding: '9px 16px',
                      fontSize: '13.5px',
                      background: on ? FORM.accent : FORM.surface,
                      color: on ? '#fff' : FORM.textPrimary,
                      borderColor: on ? FORM.accent : FORM.border
                    }}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        {category === 'rent' && (
          <Section title="Izdavanje">
            <Field label="Kvadratura (m²)" required>
              <input id="kvadratura" value={values['Kvadratura'] || ''} onChange={set('Kvadratura')} required style={inputStyle} />
            </Field>
            <Field label="Mesečna zakupnina" required>
              <input id="zakupnina" value={values['Mesečna zakupnina'] || ''} onChange={set('Mesečna zakupnina')} placeholder="npr. 450 EUR" required style={inputStyle} />
            </Field>
            <Field label="Depozit (iznos i uslovi)" required>
              <input id="depozit" value={values['Depozit'] || ''} onChange={set('Depozit')} placeholder="npr. jedna mesečna kirija" required style={inputStyle} />
            </Field>
            <Field label="Minimalni period zakupa" required>
              <input id="period" value={values['Minimalni period zakupa'] || ''} onChange={set('Minimalni period zakupa')} placeholder="npr. 12 meseci" required style={inputStyle} />
            </Field>
            <Field label="Dostupno od" required>
              <input id="dostupno" type="date" value={values['Dostupno od'] || ''} onChange={set('Dostupno od')} required style={inputStyle} />
            </Field>
            <Field label="Režije (prosečan mesečni trošak)">
              <input id="rezije" value={values['Režije'] || ''} onChange={set('Režije')} placeholder="npr. oko 60 EUR" style={inputStyle} />
            </Field>
            <Field label="Grejanje" required>
              <select id="grejanje" value={values['Grejanje'] || 'Centralno grejanje'} onChange={set('Grejanje')} style={inputStyle}>
                {['Centralno grejanje', 'Gas', 'Struja', 'Klima', 'Čvrsto gorivo', 'Podno grejanje'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Kućni ljubimci" required>
              <select id="ljubimci" value={values['Kućni ljubimci'] || 'Po dogovoru'} onChange={set('Kućni ljubimci')} style={inputStyle}>
                {['Da', 'Ne', 'Po dogovoru'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Dodatni uslovi ugovora i obaveze zakupca" hint="Bez ovoga se odgovor na peto pitanje ne može sastaviti.">
              <textarea
                id="uslovi"
                value={values['Dodatni uslovi ugovora'] || ''}
                onChange={set('Dodatni uslovi ugovora')}
                rows={3}
                placeholder="npr. plaćanje do 5. u mesecu, održavanje stana, prijava boravka..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
          </Section>
        )}

        {category === 'sale' && (
          <Section title="Prodaja">
            <Field label="Kvadratura (m²)" required>
              <input id="s-kvadratura" value={values['Kvadratura'] || ''} onChange={set('Kvadratura')} required style={inputStyle} />
            </Field>
            <Field label="Prodajna cena (EUR)" required>
              <input id="cena" value={values['Prodajna cena'] || ''} onChange={set('Prodajna cena')} required style={inputStyle} />
            </Field>
            <Field label="Vlasništvo" required>
              <select id="vlasnistvo" value={values['Vlasništvo'] || '1/1'} onChange={set('Vlasništvo')} style={inputStyle}>
                {['1/1', 'Suvlasništvo', 'Pravno lice'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Uknjiženost" required>
              <select id="uknjizenost" value={values['Uknjiženost'] || 'Da'} onChange={set('Uknjiženost')} style={inputStyle}>
                {['Da', 'Ne', 'U procesu'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Stanje objekta" required>
              <select id="stanje" value={values['Stanje objekta'] || 'Novogradnja'} onChange={set('Stanje objekta')} style={inputStyle}>
                {['Novogradnja', 'Starogradnja', 'Renoviran', 'Siva gradnja'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Kupovina na kredit" required>
              <select id="kredit" value={values['Mogućnost kupovine na kredit'] || 'Da'} onChange={set('Mogućnost kupovine na kredit')} style={inputStyle}>
                {['Da', 'Ne'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Porezi i provizija" required>
              <select id="porezi" value={values['Porezi i provizija'] || 'Uključeni u cenu'} onChange={set('Porezi i provizija')} style={inputStyle}>
                {['Uključeni u cenu', 'Dodatni'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Pripadajući prostor" hint="Podrum, terasa, garažno ili parking mesto. Bez ovoga se peto pitanje ne može popuniti.">
              <textarea
                id="pripadajuci"
                value={values['Pripadajući prostor'] || ''}
                onChange={set('Pripadajući prostor')}
                rows={3}
                placeholder="npr. podrum 6 m², terasa 8 m², garažno mesto u cenu uključeno"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
          </Section>
        )}

        {category === 'booking' && (
          <Section title="Stan na dan">
            <Field label="Cena po noćenju" required>
              <input id="b-cena" value={values['Cena po noćenju'] || ''} onChange={set('Cena po noćenju')} required style={inputStyle} />
            </Field>
            <Field label="Minimalan broj noćenja" required>
              <input id="b-min" value={values['Minimalan broj noćenja'] || ''} onChange={set('Minimalan broj noćenja')} placeholder="npr. 2" required style={inputStyle} />
            </Field>
            <Field label="Maksimalan broj gostiju" required>
              <input id="b-kapacitet" value={values['Maksimalan broj gostiju'] || ''} onChange={set('Maksimalan broj gostiju')} required style={inputStyle} />
            </Field>
            <Field label="Check-in / check-out" required>
              <input id="b-checkin" value={values['Check-in i check-out'] || ''} onChange={set('Check-in i check-out')} placeholder="npr. ulazak od 14h, izlazak do 10h" required style={inputStyle} />
            </Field>
            <Field label="Taksa za čišćenje / doplate" required>
              <input id="b-ciscenje" value={values['Taksa za čišćenje'] || ''} onChange={set('Taksa za čišćenje')} required style={inputStyle} />
            </Field>
            <Field label="Pravila kuće" required hint="Pušenje, žurke, mirni sati.">
              <textarea id="b-pravila" value={values['Pravila kuće'] || ''} onChange={set('Pravila kuće')} rows={3} required style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <Field label="Dostupne pogodnosti" hint="Wi-Fi, TV, veš mašina, klima, parking, bazen...">
              <input id="b-pogodnosti" value={values['Dostupne pogodnosti'] || ''} onChange={set('Dostupne pogodnosti')} style={inputStyle} />
            </Field>
            <Field label="Pravila otkazivanja" hint="Bez ovoga se peto pitanje ne može popuniti.">
              <textarea
                id="b-otkazivanje"
                value={values['Pravila otkazivanja'] || ''}
                onChange={set('Pravila otkazivanja')}
                rows={3}
                placeholder="npr. besplatno otkazivanje do 7 dana pre dolaska"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>
          </Section>
        )}

        <Section title="Slanje">
          <Field label="Kod za slanje" required hint="Kod koji ste dobili od Kvadrat360.">
            <input
              id="kod"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={inputStyle}
            />
          </Field>

          {error && (
            <p
              style={{
                margin: 0,
                padding: '10px 12px',
                background: FORM.dangerSoft,
                border: '1px solid ' + FORM.danger,
                borderRadius: '10px',
                color: FORM.danger,
                fontSize: '13.5px'
              }}
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={sending} style={primaryBtn}>
            {sending ? 'Šaljemo i pripremamo tekst...' : 'Pošalji nekretninu'}
          </button>
          <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textMuted }}>
            Priprema teksta na svim jezicima traje do pola minuta. Ne zatvarajte stranicu.
          </p>
        </Section>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...cardStyle, marginBottom: '16px' }}>
      <h2
        style={{
          fontSize: '13px',
          margin: 0,
          fontFamily: FORM.fontDisplay,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: FORM.accent
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: FORM.textPrimary }}>
        {label}
        {required && <span style={{ color: FORM.danger }}> *</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: FORM.textMuted }}>{hint}</span>}
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: FORM.bg,
  color: FORM.textPrimary,
  fontFamily: FORM.fontBody,
  padding: '28px 20px 64px',
  display: 'flex',
  justifyContent: 'center'
};

const cardStyle: React.CSSProperties = {
  background: FORM.surface,
  border: '1px solid ' + FORM.border,
  borderRadius: '18px',
  padding: '22px',
  width: '100%',
  maxWidth: '720px',
  boxShadow: FORM.shadow,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid ' + FORM.border,
  fontSize: '14.5px',
  fontFamily: 'inherit',
  background: FORM.surfaceAlt,
  color: FORM.textPrimary,
  width: '100%'
};

const primaryBtn: React.CSSProperties = {
  ...formBtnStyle,
  background: FORM.accent,
  color: FORM.onAccent,
  borderColor: FORM.accent,
  padding: '13px 18px',
  fontSize: '15px',
  fontWeight: 700
};
