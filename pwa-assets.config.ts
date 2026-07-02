import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimalPreset,
    apple: { sizes: [180] },
    maskable: { sizes: [512] },
    favicon: { sizes: [64, 192, 512] }
  },
  images: ['public/icon.svg']
})
