import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const backendOrigin = process.env.BACKEND_ORIGIN ?? 'http://localhost:3000';
const siteUrl = process.env.NODE_ENV !== 'development' ? (process.env.PUBLIC_SITE_URL || undefined) : undefined;

export default defineConfig({
    srcDir: './src/client',
    site: siteUrl,
    integrations: [react()],
    devToolbar: { enabled: false },
    build: {
        assets: '_assets',
    },
    vite: {
        optimizeDeps: {
            include: ['react-markdown', 'remark-gfm'],
        },
        server: {
            proxy: {
                '/api/': {
                    target: backendOrigin,
                    changeOrigin: true,
                },
                '/uploads/': {
                    target: backendOrigin,
                    changeOrigin: true,
                },
                '/joinus-files/': {
                    target: backendOrigin,
                    changeOrigin: true,
                },
            }
        },
        build: {
            cssMinify: 'lightningcss',
            assetsInlineLimit: 0,
        },
    }
});