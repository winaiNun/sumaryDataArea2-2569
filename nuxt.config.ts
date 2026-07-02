export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Dashboard สรุปผลการนิเทศ ติดตาม การเปิดภาคเรียนที่ 1/2569 สพป.นครราชสีมา เขต 2',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1e40af' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dashboard สรุปผลการนิเทศ สพป.นครราชสีมา เขต 2',
      short_name: 'Dashboard นม.2',
      description: 'สรุปผลการนิเทศ ติดตาม การเปิดภาคเรียนที่ 1 ปีการศึกษา 2569',
      theme_color: '#1e40af',
      background_color: '#f8fafc',
      display: 'standalone',
      orientation: 'landscape',
      lang: 'th',
      start_url: '/',
      icons: [
        { src: 'pwa-64x64.png',             sizes: '64x64',   type: 'image/png' },
        { src: 'pwa-192x192.png',            sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png',            sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
        }
      ]
    },
    devOptions: {
      enabled: false
    }
  }
})
