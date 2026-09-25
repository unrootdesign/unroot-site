import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Поля повторяют коллекции Webflow один в один, чтобы CSV лёг без потерь.
   Картинки лежат строками в public/cms/, не через image(),
   иначе билд падает, пока ассеты не скачаны. */

const seo = {
  seoTitle: z.string(),          // <title>, перенесён из Webflow дословно
  seoDescription: z.string(),    // meta description, дословно
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
};

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),                                        // H1
    ...seo,
    category: z.enum(['web-design', 'web-development', 'logo-design']),
    slug: z.string(),                                          // сегмент URL, менять нельзя
    excerpt: z.string().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    tags: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Adam'),
    featured: z.boolean().default(false),
    readingTime: z.string().optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    ...seo,
    slug: z.string(),
    client: z.string(),
    year: z.string().default(''),
    order: z.coerce.number().default(99),
    tags: z.array(z.string()).default([]),
    cardDescription: z.string().default(''),
    fullPage: z.boolean().default(true),   // Disable CMS Page в Webflow наоборот
    liveUrl: z.string().optional(),
    video: z.string().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    gallery: z.array(z.object({ src: z.string(), alt: z.string().default('') })).default([]),
    testimonial: z.object({
      quote: z.string(),
      name: z.string().default(''),
      role: z.string().default(''),
      photo: z.string().optional(),
    }).optional(),
  }),
});

/* Старые статьи, которые живут прямо под /blog/<slug> и не входят в CMS.
   Держим отдельно, чтобы не ломать enum категорий. */
const legacy = defineCollection({
  loader: glob({ base: './src/content/legacy', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    slug: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().default('Adam'),
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    noindex: z.boolean().default(false),
  }),
});

export const collections = { blog, 'case-studies': caseStudies, legacy };
