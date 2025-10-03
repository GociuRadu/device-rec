const puppeteer = require('puppeteer');

// --- FUNCTIE AJUTATOARE: EXTRAGE SPECIFICATII DIN PAGINA PRODUSULUI ---
async function extractSpecsFromPage(page) {
  // incearca sa culeaga specificatiile din lista structurata
  const specs = await page.$$eval(
    '.product-page-specs__list .product-specs__item',
    items => items.reduce((acc, item) => {
      const keyEl = item.querySelector('.product-specs__name');
      const valEl = item.querySelector('.product-specs__value');
      if (keyEl) acc[keyEl.innerText.trim()] = valEl ? valEl.innerText.trim() : '';
      return acc;
    }, {})
  );
  if (Object.keys(specs).length) return specs;

  // fallback: cauta in textul brut al paginii
  const text = await page.evaluate(() => document.body.innerText);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fallback = {};
  for (const line of lines) {
    if (line.toLowerCase().includes('copyright')) continue;
    const parts = line.split(/[:\t]/);
    if (parts.length === 2) fallback[parts[0].trim()] = parts[1].trim();
  }
  return fallback;
}

// --- FUNCTIA PRINCIPALA: SCRAPE eMAG PE BAZA UNUI KEYWORD ---
async function scrapeEmag(keyword) {
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0');

  // navigheaza la pagina de cautare
  const searchUrl = `https://www.emag.ro/search/${encodeURIComponent(keyword)}`;
  console.log(`Caut pe eMAG: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => window.scrollBy(0, 800));
  await new Promise(r => setTimeout(r, 1000));

  // colecteaza primele 25 de linkuri valide
  const raw = await page.$$eval(
    'a.js-product-url',
    (links, kwLower) => {
      const seen = new Set(), items = [];
      for (const a of links) {
        const href  = a.href.split('?')[0];
        const title = (a.getAttribute('title') || a.innerText).trim();
        if (!title.toLowerCase().includes(kwLower) || seen.has(href)) continue;
        const priceEl = a.closest('.card-v2')?.querySelector('.product-new-price');
        const price   = priceEl ? priceEl.innerText.replace(/\s+/g, ' ').trim() : null;
        seen.add(href);
        items.push({ title, url: href, price, source: 'emag' });
        if (items.length >= 25) break;
      }
      return items;
    },
    keyword.toLowerCase()
  );
  console.log(`→ Am gasit ${raw.length} produse pe eMAG.`);
  await page.close();

  // pentru fiecare link, deschide pagina si extrage detaliile
  const detailed = await Promise.all(raw.map(async prod => {
    const tab = await browser.newPage();
    await tab.setUserAgent('Mozilla/5.0');
    try {
      console.log(`  → Deschid: ${prod.url}`);
      await tab.goto(prod.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 500));

      // incerca sa extraga imaginea cu mai multe fallback-uri
      const image = await tab.evaluate(() => {
        const sel =
          document.querySelector('.product-gallery .thumbnail-wrapper a img') ||
          document.querySelector('.thumbnail-wrapper img') ||
          document.querySelector('.product-main-image img') ||
          document.querySelector('meta[property="og:image"]');
        if (!sel) return null;
        return sel.src || sel.getAttribute('content') || sel.getAttribute('data-src') || null;
      });

      prod.image   = image;
      prod.idimage = 1;                        // idimagini fix pentru eMAG
      prod.specs   = await extractSpecsFromPage(tab);
      await tab.close();
      return prod;
    } catch (err) {
      console.warn(`  → Eroare la ${prod.url}: ${err.message}`);
      await tab.close();
      return { ...prod, image: null, idimage: 1, specs: null };
    }
  }));

  console.log(`→ Detalii eMAG obtinute: ${detailed.length} produse`);
  await browser.close();
  return detailed;
}

module.exports = { scrapeEmag };
