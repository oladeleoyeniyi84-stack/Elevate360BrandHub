import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct domain.
 * Prefers CANONICAL_HOST over Replit dev domains when available.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no deployment domain found, skipping meta tag updates');
        return html;
      }

      const publicDir = path.resolve(process.cwd(), 'client', 'public');

      // Prefer the branded social preview image if it exists
      const socialPreviewPath = path.join(publicDir, 'social-preview', 'elevate360-logo-share.png');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageUrl: string | null = null;

      if (fs.existsSync(socialPreviewPath)) {
        imageUrl = `${baseUrl}/social-preview/elevate360-logo-share.png`;
      } else if (fs.existsSync(opengraphPngPath)) {
        imageUrl = `${baseUrl}/opengraph.png`;
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageUrl = `${baseUrl}/opengraph.jpg`;
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageUrl = `${baseUrl}/opengraph.jpeg`;
      }

      if (!imageUrl) {
        log('[meta-images] no OpenGraph image found, skipping meta tag updates');
        return html;
      }

      log('[meta-images] updating meta image tags to:', imageUrl);

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image:secure_url" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  // Prefer canonical host (production custom domain) over Replit dev domains
  if (process.env.CANONICAL_HOST) {
    const url = `https://${process.env.CANONICAL_HOST}`;
    log('[meta-images] using canonical host:', url);
    return url;
  }

  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using internal app domain:', url);
    return url;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using dev domain:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  console.log(...args);
}
