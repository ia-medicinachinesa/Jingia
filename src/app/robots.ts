import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Bloqueia o Google de indexar as páginas internas do painel e as rotas de API
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: 'https://jingia.com.br/sitemap.xml',
  }
}
