import HomePage, { homeMetadata } from '../HomePage';

export const metadata = homeMetadata('en');

// Isto osvežavanje kao srpska početna - revalidatePath u admin rutama
// osvežava i /en.
export const revalidate = 3600;

export default function HomeEn() {
  return <HomePage lang="en" />;
}
