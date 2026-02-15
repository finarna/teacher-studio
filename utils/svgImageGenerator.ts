/**
 * Generate SVG images from topic symbols
 */

/**
 * Generate an SVG image from a symbol
 */
export function generateSymbolSVG(
  symbol: string,
  symbolType: 'math' | 'emoji' | 'text',
  subject: string
): string {
  // Color schemes by subject
  const colors: Record<string, { bg: string; gradient1: string; gradient2: string; text: string }> = {
    'Math': {
      bg: '#f0f9ff',
      gradient1: '#3b82f6',
      gradient2: '#1d4ed8',
      text: '#1e3a8a'
    },
    'Physics': {
      bg: '#fef3c7',
      gradient1: '#f59e0b',
      gradient2: '#d97706',
      text: '#92400e'
    },
    'Chemistry': {
      bg: '#f0fdf4',
      gradient1: '#10b981',
      gradient2: '#059669',
      text: '#064e3b'
    },
    'Biology': {
      bg: '#fef2f2',
      gradient1: '#ef4444',
      gradient2: '#dc2626',
      text: '#7f1d1d'
    }
  };

  const colorScheme = colors[subject] || colors['Math'];

  // Font size based on symbol length and type
  let fontSize = '72';
  if (symbolType === 'emoji') {
    fontSize = '96';
  } else if (symbol.length > 8) {
    fontSize = '48';
  } else if (symbol.length > 5) {
    fontSize = '56';
  }

  // Font family based on type
  const fontFamily = symbolType === 'emoji'
    ? 'Arial, sans-serif'
    : symbolType === 'math'
    ? 'Georgia, "Times New Roman", serif'
    : 'system-ui, -apple-system, sans-serif';

  const fontWeight = symbolType === 'math' ? '600' : symbolType === 'text' ? '700' : '400';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorScheme.gradient1};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:${colorScheme.gradient2};stop-opacity:0.15" />
    </linearGradient>
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background with subtle gradient -->
  <rect width="256" height="256" fill="${colorScheme.bg}" rx="24"/>
  <rect width="256" height="256" fill="url(#bg-gradient)" rx="24"/>

  <!-- Subtle grid pattern -->
  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="${colorScheme.text}" opacity="0.05"/>
  </pattern>
  <rect width="256" height="256" fill="url(#grid)"/>

  <!-- Symbol text -->
  <text
    x="128"
    y="128"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${colorScheme.text}"
    text-anchor="middle"
    dominant-baseline="central"
    filter="url(#shadow)"
  >${escapeXml(symbol)}</text>
</svg>`;
}

/**
 * Convert SVG string to base64 data URL
 */
export function svgToBase64DataUrl(svg: string): string {
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Convert SVG to buffer for upload
 */
export function svgToBuffer(svg: string): Buffer {
  return Buffer.from(svg, 'utf-8');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
