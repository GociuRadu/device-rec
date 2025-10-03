const puppeteer = require('puppeteer')

// --- CONFIGURARE BROWSER ---
// Lanseaza un browser headless si o pagina noua
async function scrapeProductDetails(url) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0')

  try {
    // --- NAVIGARE PAGINA --- 
    console.log(`Accesez detalii: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise(r => setTimeout(r, 2000))

    // --- EXTRAGERE TEXT BRUT --- 
    const rawText = await page.evaluate(() => document.body.innerText)
    await browser.close()

    // --- PRELUCRARE LINII TEXT ---
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    // --- INITIALIZARE STRUCTURI DE DATE ---
    const specs = {}          // va contine cheie:valoare
    const batteryLines = []   // colecteaza informatii despre baterie
    const tags = []           // colecteaza tag-uri (Brand, Series, Model)

    // --- PARSARE FIECARE LINIE ---
    for (const line of lines) {
      const lower = line.toLowerCase()

      // extragere baterie
      if (lower.includes('battery') || lower.includes('mah') || lower.includes('charging')) {
        batteryLines.push(line)
      }

      // extragere tag-uri principale
      if (line.startsWith('Brand') || line.startsWith('Series') || line.startsWith('Model')) {
        const [_, value] = line.split(/[:\t]/).map(s => s.trim())
        if (value) tags.push(value)
      }

      // extragere reguli "Key: Value"
      const parts = line.split(/[:\t]/)
      if (parts.length === 2) {
        const key = parts[0].trim()
        const value = parts[1].trim()
        if (key && value) specs[key] = value
      }
    }

    // --- COMBINARE INFORMATII BATERIE SI TAGURI ---
    if (batteryLines.length) {
      specs['Battery'] = batteryLines.join(' / ')
    }
    if (tags.length) {
      specs['__tags'] = tags
    }

    return specs

  } catch (err) {
    console.error('Eroare la scrapeProductDetails:', err.message)
    await browser.close()
    return null
  }
}

module.exports = { scrapeProductDetails }
