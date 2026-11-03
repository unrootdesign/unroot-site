// схема Service для отдельных страниц под запросы (Batch 1 и 2)
export const ORG = { '@type': 'Organization', name: 'Unroot Design', url: 'https://unroot.design' };
export const service = (name: string, serviceType: string, description: string, path: string) => ({
  '@context': 'https://schema.org', '@type': 'Service', name, serviceType, description,
  url: 'https://unroot.design' + path, provider: ORG,
});
