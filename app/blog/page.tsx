import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../components/SiteTracker';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import { SITE_STYLES } from '../lib/siteStyles';
import { HOME_COPY } from '../lib/homeCopy';
import { SITE_NAME, SITE_URL } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { BLOG_POSTS } from '../lib/blogPosts';

/**
 * Spisak svih blog postova (/blog). Postovi su statični (lib/blogPosts.ts),
 * pa je ova strana potpuno statična - bez revalidate, menja se samo na
 * sledeći deploy, isto kao /za-agencije.
 */

const PATH = '/blog';

const COPY = {
  meta: {
    title: 'Blog — Kvadrat360',
    description:
      'Saveti o prodaji i izdavanju nekretnina, virtuelnim turama i fotografisanju za oglas - iz iskustva snimanja nekretnina u Kragujevcu i okolini.'
  },
  nav: { brandAria: 'Kvadrat360, početna strana', home: 'Početna', agencies: 'Za agencije', cta: 'Zakažite snimanje' },
  hero: {
    chip: 'Blog',
    titleStart: 'Pročitajte pre nego što ',
    titleEm: 'zakažete snimanje.',
    lede: 'Kratki, konkretni tekstovi o prodaji, izdavanju i fotografisanju nekretnina - bez uopštenih saveta koje ste već čuli.'
  },
  emptyTitle: 'Prvi tekst stiže uskoro',
  footer: HOME_COPY.sr.footer
};

export const metadata: Metadata = {
  title: { absolute: COPY.meta.title },
  description: COPY.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: COPY.meta.title,
    description: COPY.meta.description,
    locale: 'sr_RS'
  }
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}${PATH}`,
    url: `${SITE_URL}${PATH}`,
    name: COPY.meta.title,
    description: COPY.meta.description,
    inLanguage: 'sr',
    isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.title
      }))
    }
  };

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <SiteNav
        brandHref="/"
        brandAria={COPY.nav.brandAria}
        cta={{ href: '/#kontakt', label: COPY.nav.cta, track: 'cta:blog_nav' }}
      >
        <li><Link href="/">{COPY.nav.home}</Link></li>
        <li><Link href="/za-agencije">{COPY.nav.agencies}</Link></li>
      </SiteNav>

      <main>
        <section className="hero hero-solo" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />{COPY.hero.chip}</span>
              <h1>{COPY.hero.titleStart}<em>{COPY.hero.titleEm}</em></h1>
              <p className="lede">{COPY.hero.lede}</p>
            </div>
          </div>
        </section>

        <section className="band" id="tekstovi">
          <div className="wrap">
            {posts.length > 0 ? (
              <div className="blog-grid">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    className="card blog-card"
                    href={`/blog/${post.slug}`}
                    data-track={`cta:blog_card:${post.slug}`}
                  >
                    <h3>{post.title}</h3>
                    <p className="note">{post.excerpt}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="section-head">
                <h2>{COPY.emptyTitle}</h2>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}
