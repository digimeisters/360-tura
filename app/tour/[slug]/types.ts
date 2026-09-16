export type Language = 'sr' | 'en' | 'de' | 'ru';

export type Waypoint = {
  yaw: number;
  pitch: number;
  text_i18n?: Record<string, string> | string;
  title_i18n?: Record<string, string> | string;
  type?: 'navigation' | 'info';
  targetRoomId?: string | number;
  // Smer pogleda posle prelaza u ciljnu sobu (samo za navigacione tačke).
  // Ako nije upisan, soba se otvara u svom početnom pogledu - vidi
  // entryViewFor u transition.ts.
  targetYaw?: number;
  targetPitch?: number;
  // audio_url je stari, jednojezicni format (zadrzan radi kompatibilnosti sa
  // vec postojecim podacima). Novi kod treba da koristi audio_url_i18n.
  audio_url?: string;
  audio_url_i18n?: Record<string, string> | string;
};

export type EstablishData = {
  // Stari, jednodelni format naracije - zadržan radi soba napravljenih pre
  // podele na namenu/specifično (vidi intro_i18n/detail_i18n ispod) i radi
  // ručnog "establish" hotspota u panorami, koji i dalje piše samo ovde.
  text_i18n?: Record<string, string> | string;
  // Prvi deo uvodne naracije: namena/uloga sobe u ovom konkretnom domu.
  intro_i18n?: Record<string, string> | string;
  // Drugi deo: nešto specifično za OVU sobu (materijali, nameštaj, pogled).
  detail_i18n?: Record<string, string> | string;
  fromYaw?: number;
  pitch?: number;
  audio_url?: string;
  audio_url_i18n?: Record<string, string> | string;
};

export type Room = {
  id: string | number;
  tour_slug: string;
  title_i18n?: Record<string, string> | string;
  order_index?: number;
  waypoints_i18n?: Waypoint[] | string;
  establish_i18n?: EstablishData | string;
  panorama_url?: string;
  panorama_url_cf?: string;
  // Isečak panorame 1200x630 (migracija 004) - share kartica i početni ekran ture.
  preview_url?: string | null;
  // Pozicija ove sobe na tlocrtu ture (tour.floorplan_url), kao procenat
  // širine/visine slike (0-100). Null/undefined = soba još nema oznaku na
  // tlocrtu. Postavlja se klikom na skicu u admin modu.
  floorplan_x?: number | null;
  floorplan_y?: number | null;
};

export type Tour = {
  id: string | number;
  slug: string;
  title_i18n?: Record<string, string> | string;
  category?: 'rent' | 'sale' | 'booking';
  // Nezavisno od objave (published): da li je nekretnina i dalje dostupna
  // (migracija 010). 'active' ili nepostojeće = normalan rad; inače
  // posetilac vidi poruku umesto ture (vidi page.tsx).
  status?: 'active' | 'rented' | 'sold' | 'paused';
  location_map_url?: string;
  about_text_i18n?: Record<string, string> | string;
  floorplan_url?: string;
  faq_1_i18n?: Record<string, string> | string;
  faq_2_i18n?: Record<string, string> | string;
  faq_3_i18n?: Record<string, string> | string;
  faq_4_i18n?: Record<string, string> | string;
  faq_5_i18n?: Record<string, string> | string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  agency_name?: string;
  // Putanja automatskog vodiča: redni brojevi soba (order_index) odvojeni
  // zarezom, npr. "1,2,3,2,4,2,5" - vidi guidePath.ts. Prazno/undefined = tura
  // nema automatskog vodiča.
  guide_path?: string | null;
};

export type ActiveModal = 'plan' | 'location' | 'about' | 'faq' | 'contact' | null;
