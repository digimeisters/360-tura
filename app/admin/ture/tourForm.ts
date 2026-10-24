/**
 * Forma ture u adminu: oblik, prazna forma i nazivi tipova oglasa - zajedničko
 * za stranu Ture (page.tsx) i panel sa formom (TourFormDrawer.tsx).
 */

export type FormState = {
  title: string;
  agency_name: string;
  address: string;
  city: string;
  district: string;
  structure: string;
  area_sqm: string;
  price: string;
  floor: string;
  has_elevator: string;
  has_basement: string;
  heating: string;
  build_status: string;
  finish_status: string;
  terrace: string;
  parking: string;
  deposit: string;
  registration: string;
  property_type: string;
  category: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  nadir_logo: boolean;
  /** Srpski odgovori na pet pitanja - samo pri izmeni postojeće ture. */
  faq: string[];
};

export const EMPTY_FORM: FormState = {
  title: '',
  agency_name: '',
  address: '',
  city: '',
  district: '',
  structure: '',
  area_sqm: '',
  price: '',
  floor: '',
  has_elevator: '',
  has_basement: '',
  heating: '',
  build_status: '',
  finish_status: '',
  terrace: '',
  parking: '',
  deposit: '',
  registration: '',
  property_type: '',
  category: 'rent',
  agent_name: '',
  agent_phone: '',
  agent_email: '',
  nadir_logo: true,
  faq: ['', '', '', '', '']
};

export const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Izdavanje',
  sale: 'Prodaja',
  booking: 'Stan na dan'
};
