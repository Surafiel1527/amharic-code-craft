import { describe, it, expect, vi } from 'vitest';
import { 
  loadHtml2Canvas, 
  loadPrism, 
  loadRecharts, 
  loadJSZip, 
  loadImageCompression 
} from '@/utils/lazyLibraries';

describe('Lazy Library Loading', () => {
  it('loadHtml2Canvas returns a function', async () => {
    const html2canvas = await loadHtml2Canvas();
    expect(typeof html2canvas).toBe('function');
  });

  it('loadPrism returns Prism object', async () => {
    const Prism = await loadPrism();
    expect(Prism).toBeDefined();
    expect(Prism.highlight).toBeDefined();
  });

  it('loadRecharts returns chart components', async () => {
    const recharts = await loadRecharts();
    expect(recharts.LineChart).toBeDefined();
    expect(recharts.BarChart).toBeDefined();
  });

  it('loadJSZip returns JSZip class', async () => {
    const JSZip = await loadJSZip();
    expect(JSZip).toBeDefined();
    const zip = new JSZip();
    expect(zip.file).toBeDefined();
  });

  it('loadImageCompression returns compression function', async () => {
    const imageCompression = await loadImageCompression();
    expect(typeof imageCompression).toBe('function');
  });
});
