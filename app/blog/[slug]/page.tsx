import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteTracker from '../../../components/SiteTracker';
import SiteReveal from '../../../components/SiteReveal';
import ReadingProgress from '../../../components/ReadingProgress';
import { SiteNav, SiteFooter } from '../../../components/SiteChrome';
import { BlogPricingSnapshot } from '../../../components/BlogPricingSnapshot';
import { HOME_COPY } from '../../lib/homeCopy';
import { BLOG_AUTHOR, SITE_NAME, SITE_URL } from '../../lib/site';
import { serializeJsonLd } from '../../lib/structuredData';
import { BLOG_POSTS, getBlogPost } from '../../lib/blogPosts';
import SiteStylesheets from '../../../components/SiteStylesheets';

type Props = { params: Promise<{ slug: string }> };

const NAV = { brandAria: 'Kvadrat360, početna strana', home: 'Početna', agencies: 'Za agencije', cta: 'Zakažite snimanje' };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return { title: 'Tekst nije pronađen', robots: { index: false, follow: false } };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = post.seoTitle ?? post.title;
  return {
    title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title,
      description: post.description,
      locale: 'sr_RS',
      publishedTime: post.publishedAt
    },
    twitter: { card: 'summary_large_image', title, description: post.description }
  };
}

// "2026-10-22" -> "22. 10. 2026." - iz samog niza, bez Date, da vremenska
// zona servera ne pomeri dan.
function srDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}.`;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url }
        ]
      },
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        image: `${url}/opengraph-image`,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        inLanguage: 'sr',
        author: {
          '@type': 'Person',
          name: BLOG_AUTHOR.name,
          jobTitle: BLOG_AUTHOR.jobTitle,
          description: BLOG_AUTHOR.bio,
          worksFor: { '@id': `${SITE_URL}/#business` }
        },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
      }
    ]
  };

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />
      <SiteReveal />
      <ReadingProgress targetId="tekst" />

      <SiteNav
        brandHref="/"
        brandAria={NAV.brandAria}
        cta={{ href: '/#kontakt', label: NAV.cta, track: 'cta:blog_post_nav' }}
        mainMenu={{}}
      />

      {/* .rv-page: vrh izranja (siteStyles); tekst se ne pomera, samo traka napretka čitanja. */}
      <main className="rv-page">
        <section className="hero hero-solo" id="pocetna">
          <div className="wrap">
            <div>
              <h1>{post.title}</h1>
              <p className="lede">{post.excerpt}</p>
              <p className="blog-date">
                {BLOG_AUTHOR.name} · Objavljeno <time dateTime={post.publishedAt}>{srDate(post.publishedAt)}</time>
                {post.updatedAt && post.updatedAt !== post.publishedAt && (
                  <>
                    {' · '}ažurirano <time dateTime={post.updatedAt}>{srDate(post.updatedAt)}</time>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="band" id="tekst">
          <div className="wrap blog-article">
            {post.sections.map((section, i) => (
              <div key={i} className={section.variant === 'callout' ? 'blog-section blog-callout' : 'blog-section'}>
                {section.heading && <h2>{section.heading}</h2>}
                {section.paragraphs.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="blog-bullets">
                    {section.bullets.map((bullet, j) => (
                      <li key={j}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.list && (
                  <dl className="blog-list">
                    {section.list.map((entry) => (
                      <div key={entry.term}>
                        <dt>{entry.term}</dt>
                        <dd>{entry.text}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}

            {slug === 'koliko-kosta-fotografisanje-nekretnine-za-oglas' && (
              <div className="blog-section">
                <h2>A naša cena, tačno</h2>
                <p>Ovo su naše trenutne cene za jednu nekretninu - ažuriraju se ovde automatski, uključujući i popust dok traje uvodna promocija.</p>
                <BlogPricingSnapshot />
              </div>
            )}

            <p className="blog-cta">
              <Link className="btn btn-primary" href={post.cta?.href ?? '/#kontakt'} data-track={`cta:blog_inline:${post.slug}`}>
                {post.cta?.label ?? 'Zakažite snimanje'}
              </Link>
            </p>

            <p className="blog-author">
              <strong>O autoru.</strong> {BLOG_AUTHOR.bio}
            </p>
          </div>
        </section>

        <section id="poziv">
          <div className="wrap cta-band">
            <div className="section-head">
              <h2 data-reveal="blur">Sledeći korak</h2>
              <ul className="blog-related">
                {post.relatedLinks.map((link) => (
                  <li key={link.href} data-reveal="list">
                    <Link href={link.href} data-track={`cta:blog_related:${post.slug}`}>{link.label}</Link>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '1.2rem' }} data-reveal="up">
                <Link className="btn btn-primary" href="/#kontakt" data-track="cta:blog_bottom">Zakažite snimanje</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter note={HOME_COPY.sr.footer} />
    </div>
  );
}
