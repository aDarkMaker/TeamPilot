import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const backendOrigin = process.env.BACKEND_ORIGIN ?? 'http://localhost:3000';

export default defineConfig({
    srcDir: './src/client',
    integrations: [react()],
    devToolbar: { enabled: false },
    build: {
        assets: '_assets',
    },
    vite: {
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
            rollupOptions: {
                output: {
                    manualChunks: {
                        react: ['react', 'react-dom'],
                        markdown: ['react-markdown', 'remark-gfm'],
                    },
                },
            },
            cssMinify: 'lightningcss',
        },
    }
});