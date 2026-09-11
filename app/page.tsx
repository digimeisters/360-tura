import HomePage, { homeMetadata } from './HomePage';

export const metadata = homeMetadata('sr');

// Objavljene ture se na početnoj pojavljuju same. Strana je statična i
// osvežava se najkasnije na sat - a odmah kad se tura objavi, skine ili joj
// se promeni panorama (revalidatePath u /api/admin/tours i upload-panorama).
export const revalidate = 3600;

export default function Home() {
  return <HomePage lang="sr" />;
}
