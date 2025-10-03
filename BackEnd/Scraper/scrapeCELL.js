const puppeteer = require('puppeteer')

/*
  === SCRAPER PENTRU CEL.RO ===
  Acest modul exporta functia scrapeCell(keyword)
  care cauta  produse pe cel.ro pentru keyword primele la cautari;
  si returneaza un array de obiecte cu detalii pentru fiecare produs.
*/

// --- FUNCTII AJUTATOARE PENTRU EXTRAGERE SPECIFICATII ---

// Extrage specificatii din tabelul de pe pagina produsului
async function parseTableSpecs(page) {
  return page.$$eval(
    'table.specs-table tbody tr',
    rows => {
      const specs = {}
      let section = null

      for (const tr of rows) {
        const th = tr.querySelector('th')
        if (th) {
          // cap de sectiune, retinem numele sectiunii
          section = th.innerText.trim()
          continue
        }
        const tds = tr.querySelectorAll('td')
        if (tds.length >= 2) {
          // cheia si valoarea specificatiei
          const key = tds[0].innerText.trim()
          const val = tds[1].innerText.trim()
          // daca avem sectiune, prefixam cu sectiune
          const fullKey = section ? `${section} › ${key}` : key
          specs[fullKey] = val
        }
      }

      return specs
    }
  )
}

// Extrage specificatii din textul paginii (fallback daca nu exista tabel)
async function parseTextSpecs(page) {
  // luam tot textul paginii
  const text = await page.evaluate(() => document.body.innerText)
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.includes(':')) // gasim doar liniile care au ':'

  const specs = {}
  for (const line of lines) {
    const [k, ...rest] = line.split(':')
    const v = rest.join(':').trim()
    // ignoram cheile prea lungi si valorile goale
    if (k.length < 50 && v) specs[k.trim()] = v
  }

  return specs
}

// --- FUNCTIA PRINCIPALA SCRAPECELL ---

async function scrapeCell(keyword) {
  try {
    // 1) pornim browser headless cu optiuni de sandbox
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    // 2) deschidem pagina de cautare
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0')

    // mic delay initial pentru incarcari mai stabile
    await new Promise(r => setTimeout(r, 1500))

    // url de cautare pentru cel.ro
    const searchUrl = `https://www.cel.ro/cauta/${encodeURIComponent(keyword)}/`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 9000 })

    // scroll pentru a forta incarcarea produselor dinamice
    await page.evaluate(() => window.scrollBy(0, 500))
    await new Promise(r => setTimeout(r, 1000))

    // 3) colectam primele 5 link-uri relevante
    const results = await page.$$eval(
      'a[href$="-l/"]',
      (links, kw) => {
        const seen = new Set()
        const out = []

        for (const a of links) {
          const href = a.href.split('?')[0]
          const title = (a.title || a.innerText).trim()
          // filtram dupa keyword in titlu
          if (!title.toLowerCase().includes(kw)) continue
          if (seen.has(href)) continue
          seen.add(href)
          out.push({ title, url: href, source: 'cell' })
          if (out.length >= 5) break
        }

        return out
      },
      keyword.toLowerCase()
    )

    // 4) pentru fiecare link, deschidem pagina si extragem detalii
    const detailed = []
    for (const raw of results) {
      const tab = await browser.newPage()
      await tab.setUserAgent('Mozilla/5.0')

      try {
        await tab.goto(raw.url, { waitUntil: 'domcontentloaded', timeout: 9000 })

        // 4a) pretul produsului (extragem doar cifre)
        raw.price = await tab.$eval(
          '#product-price',
          el => el.innerText.trim().replace(/\D/g, '')
        ).catch(() => null)

        // 4b) URL imagine: incercam pe mai multe selectoare
        raw.image = await tab.evaluate(() => {
          const sel =
            document.querySelector('#main-product-image') ||
            document.querySelector('ul#scroll_poze img') ||
            document.querySelector('img')
          return sel ? (sel.src || sel.getAttribute('data-src') || null) : null
        })

        // 4c) specificatii: tabel sau text
        if (await tab.$('table.specs-table')) {
          raw.specs = await parseTableSpecs(tab)
        } else {
          raw.specs = await parseTextSpecs(tab)
        }

        detailed.push(raw)
      } catch (err) {
        console.warn('scrapeCELL error @', raw.url, err.message)
      }

      await tab.close()
    }

    // 5) inchidem browser si returnam detalii
    await browser.close()
    return detailed
  } catch (err) {
    console.warn('scrapeCell major error:', err.message)
    return []
  }
}

module.exports = { scrapeCell }
