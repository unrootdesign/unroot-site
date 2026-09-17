export type PageBlueprint = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: string[];
  source: string;
};

export const pages: PageBlueprint[] = [
  {
    slug: 'services',
    title: 'Branding & Design Services for Modern Companies | Unroot Design',
    description: 'Build a bold, scalable brand with Unroot.design. We craft modern, timeless identities and websites that help startups and tech companies grow.',
    eyebrow: 'Services',
    h1: 'Unroot Services',
    intro: 'Overview of the studio offer. This wireframe keeps the current service hierarchy while leaving the visual system open for redesign.',
    sections: ['Full branding', 'Website design', 'Website development', '3D custom visuals', 'AI visuals & concept design', 'Concept CTA'],
    source: 'services.html'
  },
  {
    slug: 'web-design',
    title: 'We Design Websites That Inspire, Engage, and Drive Real Results | Unroot.design',
    description: 'Discover how Unroot designs websites that convert: from custom layouts and user-centered design to responsive development and ongoing support.',
    eyebrow: 'Service',
    h1: 'We Design Websites That Inspire, Engage, and Drive Real Results',
    intro: 'Long-form service page. The current content sequence is preserved as modular sections.',
    sections: ['Planning', 'Design', 'Development', 'Support', 'What you get', 'Why clients work with Unroot', 'Selected websites', 'Industries', 'Related reading', 'Final CTA'],
    source: 'web-design.html'
  },
  {
    slug: 'web-development',
    title: 'Webflow & Framer Development for Marketing Sites | Unroot.design',
    description: 'We build responsive, production-ready websites in Webflow and Framer — clean structure, scalable CMS, strong performance, and SEO-ready setup.',
    eyebrow: 'Service',
    h1: 'Webflow / Framer Development',
    intro: 'Development service structure retained for migration; platform-specific language can later be updated for the new stack.',
    sections: ['What development means', 'What we build', 'Webflow vs Framer', 'Build standards', 'Migration', 'What we need to build fast', 'Related reading', 'Final CTA'],
    source: 'web-development.html'
  },
  {
    slug: 'logo-design',
    title: 'Standout Logo Design Services for Modern Brands | Unroot.design',
    description: 'Get a memorable, versatile logo crafted for your brand by Unroot.design. Our step-by-step process delivers custom, scalable logos for AI startups, tech companies and Saas.',
    eyebrow: 'Service',
    h1: 'We design Standout Logos for Modern Brands',
    intro: 'Existing process-heavy page mapped into reusable content sections.',
    sections: ['Discovery & brief', 'Research & direction', 'Concept exploration', 'Digital drafts', 'Feedback', 'Refinement', 'Final exports', 'Add-ons', 'Deliverables', 'Why Unroot', 'Selected work', 'Industries', 'Final CTA'],
    source: 'logo-design.html'
  },
  {
    slug: 'redesign',
    title: 'Redesign | Unroot Design',
    description: 'Get free hero redesigns of your website in next 48h',
    eyebrow: 'Offer',
    h1: 'Elevate first impression of your website',
    intro: 'Compact landing page skeleton for the redesign offer.',
    sections: ['Offer explanation', 'Before / after proof', 'How it works', 'Submission / CTA', 'Studio CTA'],
    source: 'redesign.html'
  },
  {
    slug: 'pricing',
    title: 'Pricing | Unroot.design',
    description: '',
    eyebrow: 'Pricing',
    h1: 'Prices without surprises',
    intro: 'Pricing structure retained as three clear offer blocks.',
    sections: ['Monthly Work', 'MVP Website / Product', 'Start with Concept', 'FAQ / objections', 'Final CTA'],
    source: 'pricing.html'
  },
  {
    slug: 'careers',
    title: 'Careers | Unroot.design',
    description: '',
    eyebrow: 'Careers',
    h1: 'Together, we build more than products',
    intro: 'Careers page wireframe including principles, open roles and application area.',
    sections: ['Our principles', 'Current openings', 'What we value', 'Who belongs with us', 'Application form', 'Final CTA'],
    source: 'careers.html'
  },
  {
    slug: 'blog',
    title: 'Blog — Insights & Ideas for Modern Branding and Logo Design | Unroot Design',
    description: 'Explore Unroot Blog for expert insights on modern branding, logo design, and creative strategy. Discover guides, tips, and stories to elevate your brand identity.',
    eyebrow: 'Insights',
    h1: 'Unroot Blog',
    intro: 'Blog listing is now generated from the exported Webflow CMS.',
    sections: ['Imported article grid', 'Tags', 'Existing public article URLs', 'Final CTA'],
    source: 'blog.html'
  },
  {
    slug: 'call',
    title: 'Book a Call | Unroot Design',
    description: '',
    eyebrow: 'Contact',
    h1: "Let's talk about your project",
    intro: 'Booking/contact page shell. The final form or scheduler integration can be connected later.',
    sections: ['Intro / expectations', 'Scheduler or form', 'Trust / selected clients', 'Final CTA'],
    source: 'call.html'
  }
];

export const home: PageBlueprint = {
  slug: '',
  title: 'Design partner for AI and Tech founders | Unroot Design',
  description: 'We design and build premium, custom websites with 3D & motion. We clarify complex products, ship in Webflow, and lift conversions with fast weekly sprints.',
  eyebrow: 'Home',
  h1: 'Senior Design partner for AI and Tech founders',
  intro: 'The homepage is intentionally only a structural placeholder because this is the page planned for the new visual direction.',
  sections: ['Hero', 'Services overview', 'Selected work', 'How we work', 'Testimonials', 'FAQ', 'Primary CTA'],
  source: 'index.html'
};
