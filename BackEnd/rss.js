// rss.js

const BASE_URL = 'https://web-gociuradu-stativadarius.onrender.com';

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, s => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[s]));
}

function generateRss(products) {
  const items = products.map(prod => {
    const p = prod.toJSON ? prod.toJSON() : prod;

    const link = p.url || `${BASE_URL}/products/${p.id}`;
    const title = escapeXml(p.name || "Produs necunoscut");

    let features = p.features;
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch {
        features = [];
      }
    }
    if (!Array.isArray(features)) features = [];

    const featuresStr = features.length
      ? ` | Caracteristici: ${features.join(', ')}`
      : '';

    const desc = `Pret: ${p.price} | Culoare: ${p.color}${featuresStr}`;
    const description = escapeXml(desc);
    const pubDate = new Date().toUTCString();

    return `
      <item>
        <title>${title}</title>
        <link>${link}</link>
        <description>${description}</description>
        <pubDate>${pubDate}</pubDate>
        <guid>${link}</guid>
      </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Top 100 Produse</title>
  <link>${BASE_URL}/products</link>
  <description>Produsele cele mai populare recomandate</description>
  ${items}
</channel>
</rss>`;
}

module.exports = { generateRss };
