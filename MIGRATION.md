# Unroot migration — structure phase

## Batch 1: wireframed routes

- `/`
- `/services`
- `/web-design`
- `/web-development`
- `/logo-design`
- `/redesign`
- `/pricing`
- `/careers`
- `/blog`
- `/call`

The current Webflow page titles, meta descriptions (where present), H1s, and major content section order are represented in `src/data/pages.ts`.

## Next batch

1. `/templates`
2. `/concept`
3. `/privacy`
4. `/terms`
5. `/404`
6. Case study collection routes from `Unroot Case Studies.csv`
7. Article routes from `Unroot Articles.csv` + group collections
8. Author/tag routes only if they are currently public/indexable
9. Form handling for careers/contact
10. Sitemap, robots, canonical/redirect audit against production

## Design strategy

The homepage is intentionally a shell. New visual design can be developed there first, then promoted into shared components/layouts without changing route structure or migrated CMS data.

## Blog CMS migration (v2)

- 7/7 current Articles CMS items imported into `src/data/blog.json`.
- Public collection URLs preserved through the group collections:
  - `/logo-design/ai-vs-human-study-2025`
  - `/logo-design/professional-guide`
  - `/logo-design/for-clothing-brand`
  - `/web-design/business-website`
  - `/web-design/responsive-design`
  - `/web-design/framer-templates-for-ai`
  - `/web-development/webflow-vs-framer`
- Article rich text is retained as exported HTML.
- Linked FAQ items, author data, tags, meta title, meta description and OG image are retained.
- CMS media URLs currently remain on Webflow's CDN. Before cancelling/removing the Webflow project, copy these media assets to the new host and rewrite URLs so the new site has no Webflow runtime dependency.

## Local media migration (v3)

- The complete `images/` directory from the Webflow code export plus all 9 exported video poster images are copied to `public/assets/webflow-export/` (620 image assets total).
- CMS rich-text media is different: Webflow's CSV export stores many of those items only as CDN URLs rather than embedding the files in the ZIP.
- Run `npm run localize-assets` once while the old Webflow CDN is still online. The script downloads every Webflow CDN media URL referenced by the new source into `public/assets/cms/` and rewrites the source URLs to local paths.
- After that command finishes, commit both `src/` and `public/assets/cms/`. The migrated blog then has no runtime dependency on Webflow's media CDN.

## Homepage concept v4

The homepage now prototypes the chosen direction:
- fixed studio/pitch panel on desktop;
- scrollable project feed;
- Cmd/Ctrl+K command palette with search and keyboard navigation;
- active-project state while scrolling;
- lightweight draggable project playground (no 3D dependency);
- responsive fallback for mobile.

The blog article template now also builds a Contents block from H2/H3 headings and adds anchor links, matching the behavior that previously came from the Webflow/Finsweet TOC script.
