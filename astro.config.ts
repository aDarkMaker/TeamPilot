import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
    srcDir: './src/client',
    integrations: [react()],
    devToolbar: { enabled: false },
});