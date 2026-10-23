/**
 * Naši primeri tura (agencija "Kvadrat360 · primer") pokazuju šta tura ume,
 * ali nisu oglasi: nemaju cenu ni ponudu za Google (pregled 23. 10. 2026 -
 * "270 € / mesečno" je posetioca terao da se ponaša kao zakupac, a ne kao
 * budući klijent). Bez uvoza, jer ga koristi i klijent (tura).
 */
export function isDemoTour(agencyName: string | null | undefined): boolean {
  return /kvadrat360/i.test(agencyName ?? '');
}
