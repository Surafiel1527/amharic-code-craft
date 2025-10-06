/**
 * Lazy Library Loading Utilities
 * 
 * Load heavy libraries only when they're actually needed.
 * This significantly reduces the initial bundle size.
 */

import { logger } from './logger';

/**
 * Load html2canvas for taking screenshots
 * Usage: const html2canvas = await loadHtml2Canvas();
 */
export const loadHtml2Canvas = async () => {
  try {
    logger.debug('Loading html2canvas library');
    const module = await import('html2canvas');
    return module.default;
  } catch (error) {
    logger.error('Failed to load html2canvas', error);
    throw error;
  }
};

/**
 * Load Prism.js for code syntax highlighting
 * Usage: const Prism = await loadPrism();
 */
export const loadPrism = async () => {
  try {
    logger.debug('Loading prismjs library');
    const module = await import('prismjs');
    
    // Also load commonly used languages
    await Promise.all([
      import('prismjs/components/prism-typescript'),
      import('prismjs/components/prism-jsx'),
      import('prismjs/components/prism-tsx'),
      import('prismjs/components/prism-json'),
      import('prismjs/components/prism-css'),
      import('prismjs/components/prism-bash'),
    ]);
    
    return module.default;
  } catch (error) {
    logger.error('Failed to load prismjs', error);
    throw error;
  }
};

/**
 * Load Recharts for data visualization
 * Usage: const { LineChart, Line, XAxis } = await loadRecharts();
 */
export const loadRecharts = async () => {
  try {
    logger.debug('Loading recharts library');
    const module = await import('recharts');
    return module;
  } catch (error) {
    logger.error('Failed to load recharts', error);
    throw error;
  }
};

/**
 * Load JSZip for creating zip files
 * Usage: const JSZip = await loadJSZip();
 */
export const loadJSZip = async () => {
  try {
    logger.debug('Loading jszip library');
    const module = await import('jszip');
    return module.default;
  } catch (error) {
    logger.error('Failed to load jszip', error);
    throw error;
  }
};

/**
 * Load browser-image-compression for image optimization
 * Usage: const imageCompression = await loadImageCompression();
 */
export const loadImageCompression = async () => {
  try {
    logger.debug('Loading browser-image-compression library');
    const module = await import('browser-image-compression');
    return module.default;
  } catch (error) {
    logger.error('Failed to load browser-image-compression', error);
    throw error;
  }
};

/**
 * Example Usage:
 * 
 * // Instead of importing at the top:
 * // import html2canvas from 'html2canvas';
 * 
 * // Load on-demand when needed:
 * const takeScreenshot = async (element: HTMLElement) => {
 *   const html2canvas = await loadHtml2Canvas();
 *   const canvas = await html2canvas(element);
 *   return canvas.toDataURL();
 * };
 * 
 * // For code highlighting:
 * const highlightCode = async (code: string, language: string) => {
 *   const Prism = await loadPrism();
 *   return Prism.highlight(code, Prism.languages[language], language);
 * };
 */
