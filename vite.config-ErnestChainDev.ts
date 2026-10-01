import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type PreviewServer, type ViteDevServer } from 'vite'
import { createSiteStats } from './server/site-stats.ts'
import { createPortfolioAI } from './server/portfolio-ai.ts'

function attachServices(server: ViteDevServer | PreviewServer, env: Record<string, string>) {
  const stats = createSiteStats({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY });
  const assistant = createPortfolioAI({ apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL });
  server.middlewares.use(assistant.handle);
  server.middlewares.use(stats.handle);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read server credentials without exposing them through import.meta.env.
  const env = loadEnv(mode, process.cwd(), ['OPENROUTER_', 'SUPABASE_']);
  return {
    plugins: [react(), tailwindcss(), {
      name: 'portfolio-services',
      configureServer: server => attachServices(server, env),
      configurePreviewServer: server => attachServices(server, env),
    }],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
})

