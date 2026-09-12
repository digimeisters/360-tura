// Pannellum (biblioteka za 360° prikaz) treba samo turi, pa se ne učitava na
// celom sajtu. Tura ga najavljuje odmah uz HTML (preload), a učitava kad se
// komponenta podigne - do klika na "Započni turu" je već u kešu.
// Skripta je naša kopija 2.5.6 sa jednom izmenom (panorama se raspakuje u
// pozadini, bez zamrzavanja pri prelazu u sobu) - pravi je
// scripts/patch-pannellum.mjs. Stil se ne menja, pa ostaje sa CDN-a.
export const PANNELLUM_JS = '/vendor/pannellum-2.5.6-k360.js';
export const PANNELLUM_CSS = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
