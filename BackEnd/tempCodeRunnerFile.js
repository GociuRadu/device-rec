// BackEnd/server.js

const http      = require('http')
const url       = require('url')
const crypto    = require('crypto')
const fs        = require('fs')
const path      = require('path')
const { parse } = require('querystring')

const { findByUsername, createUser } = require('./login/userDAO')
const Products                        = require('./Products/Products')
const { scrapeCell }                  = require('./Scraper/scrapeCELL')
const { scrapeEmag }                  = require('./Scraper/scrapeEmag')
const { transformToProduct }          = require('./Scraper/transformer')
const { generateRss }                 = require('./rss')

const sessions   = {}                       // in-memory store pentru sesiuni
const staticRoot = path.join(__dirname, '..', 'FrontEnd', 'frontend')

// validare simpla JSON payload
function validate(fields, rules) {
  for (const [k, rule] of Object.entries(rules)) {
    const v = fields[k]
    if (rule.required && (v === undefined || v === null || v === '')) {
      return `Missing field: ${k}`
    }
    if (rule.type && typeof v !== rule.type) {
      return `Invalid type for ${k}: expected ${rule.type}`
    }
    if (rule.minLength && String(v).length < rule.minLength) {
      return `Field ${k} too short (min ${rule.minLength})`
    }
  }
  return null
}

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex')
}

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  return header
    .split(';')
    .map(c => c.trim().split('='))
    .reduce((acc, [k, v]) => (acc[k] = decodeURIComponent(v), acc), {})
}

function setSessionCookie(res, sessionId) {
  const cookie = `sessionId=${sessionId}; Path=/; Max-Age=3600`
  res.setHeader('Set-Cookie', cookie)
}

function getSession(req, res, autoCreate = true) {
  const cookies = parseCookies(req)
  const sid     = cookies.sessionId
  let   sess    = sid && sessions[sid]
  if (!sess || sess.expires < Date.now()) {
    if (!autoCreate) return {}
    const newSid = generateSessionId()
    sess = { data: {}, expires: Date.now() + 3600*1000 }
    sessions[newSid] = sess
    setSessionCookie(res, newSid)
  } else {
    sess.expires = Date.now() + 3600*1000
  }
  return sess.data
}

function requireAdmin(session, res) {
  if (!session.user || session.user.role !== 'admin') {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Access denied: admin only' }))
    return false
  }
  return true
}

const catalog = new Products()

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const session   = getSession(req, res)
  const { pathname } = url.parse(req.url, true)

  // — GET /export/json — descarca toate produsele in JSON
  if (pathname === '/export/json' && req.method === 'GET') {
    const rows = await catalog.getAll()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="products.json"')
    return res.end(JSON.stringify(rows, null, 2))
  }

  // — GET /export/csv — descarca toate produsele in CSV
  if (pathname === '/export/csv' && req.method === 'GET') {
    const rows = await catalog.getAll()
    if (!rows.length) {
      res.writeHead(204); return res.end()
    }
    const header = Object.keys(rows[0]).join(',') + '\n'
    const body = rows.map(r =>
      Object.values(r)
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"')
    return res.end(header + body)
  }

  // POST /login
  if (pathname === '/login' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    return req.on('end', async () => {
      let creds
      try { creds = JSON.parse(body) }
      catch {
        res.writeHead(400); return res.end(JSON.stringify({ error: 'Bad JSON' }))
      }
      // validare
      const err1 = validate(creds, {
        username: { required: true, type: 'string', minLength: 3 },
        password: { required: true, type: 'string', minLength: 4 }
      })
      if (err1) {
        res.writeHead(400); return res.end(JSON.stringify({ error: err1 }))
      }
      const { username, password } = creds
      const user = await findByUsername(username)
      if (user && user.password === password) {
        session.user = { username: user.username, role: user.role }
        res.writeHead(200); return res.end(JSON.stringify({ success: true, user: session.user }))
      } else {
        res.writeHead(401); return res.end(JSON.stringify({ error: 'Invalid credentials' }))
      }
    })
  }

  // POST /register
  if (pathname === '/register' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    return req.on('end', async () => {
      let data
      try { data = JSON.parse(body) }
      catch {
        res.writeHead(400); return res.end(JSON.stringify({ error: 'Bad JSON' }))
      }
      const err2 = validate(data, {
        username: { required: true, type: 'string', minLength: 3 },
        password: { required: true, type: 'string', minLength: 4 }
      })
      if (err2) {
        res.writeHead(400); return res.end(JSON.stringify({ error: err2 }))
      }
      const { username, password } = data
      const exists = await findByUsername(username)
      if (exists) {
        res.writeHead(409); return res.end(JSON.stringify({ error: 'User already exists' }))
      }
      await createUser({ username, password, role: 'user' })
      res.writeHead(201); return res.end(JSON.stringify({ success: true }))
    })
  }

  // POST /logout
  if (pathname === '/logout' && req.method === 'POST') {
    delete session.user
    res.writeHead(200); return res.end(JSON.stringify({ success: true }))
  }

  // GET /session
  if (pathname === '/session' && req.method === 'GET') {
    const sid  = parseCookies(req).sessionId
    const sess = sid && sessions[sid]
    const user = sess?.data?.user || null
    res.writeHead(200); return res.end(JSON.stringify({ user }))
  }

  // GET /products
  if (pathname === '/products' && req.method === 'GET') {
    try {
      const rows = await catalog.loadTop100()
      const prods = rows.map(r => {
        let feats = r.features; if (typeof feats === 'string') try { feats = JSON.parse(feats) } catch {}
        let tags  = r.tags;     if (typeof tags ===  'string') try { tags  = JSON.parse(tags)  } catch {}
        return { ...r, features: feats, tags, recommended: r.recommended }
      })
      res.writeHead(200); return res.end(JSON.stringify(prods))
    } catch {
      res.writeHead(500); return res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

// GET /products/:id
if (pathname.match(/^\/products\/\d+$/) && req.method === 'GET') {
  const id = Number(pathname.split('/')[2])
  try {
    // Căutăm produsul în baza de date
    const row = await catalog.getById(id)
    if (!row) {
      res.writeHead(404); 
      return res.end(JSON.stringify({ error: 'Product not found' }))
    }

    // Incrementăm popularitatea produsului
    row.popularity += 1;

    // Actualizăm produsul în baza de date
    await catalog.update(id, row);

    // Procesăm caracteristicile și etichetele
    let feats = row.features; 
    if (typeof feats === 'string') try { feats = JSON.parse(feats) } catch {}
    
    let tags = row.tags;     
    if (typeof tags === 'string') try { tags = JSON.parse(tags) } catch {}

    // Construim produsul final
    const prod = { 
      ...row, 
      features: feats, 
      tags, 
      recommended: row.recommended
    };

    // Trimitem produsul cu popularitatea incrementată către frontend
    res.writeHead(200); 
    return res.end(JSON.stringify(prod))
  } catch (err) {
    res.writeHead(500); 
    return res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}


  // PUT /products/:id
  if (pathname.match(/^\/products\/\d+$/) && req.method === 'PUT') {
    if (!requireAdmin(session,res)) return
    let body=''
    req.on('data', c=> body+=c)
    return req.on('end', async()=>{
      const p  = JSON.parse(body)
      const id = Number(pathname.split('/')[2])
      await catalog.update(id,p)
      res.writeHead(200); res.end(JSON.stringify({ success:true }))
    })
  }

  // DELETE /products/:id
  if (pathname.match(/^\/products\/\d+$/) && req.method === 'DELETE') {
    if (!requireAdmin(session,res)) return
    const id = Number(pathname.split('/')[2])
    await catalog.delete(id)
    res.writeHead(200); return res.end(JSON.stringify({ success:true }))
  }

  if (pathname === '/import/json' && req.method === 'POST') {
  if (!requireAdmin(session, res)) return;

  let body = '';
  req.on('data', chunk => body += chunk);
  return req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      if (!Array.isArray(data)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'JSON must be an array of products' }));
      }

      for (const p of data) {
        await new Promise(resolve => {
          catalog.add(p, () => resolve());  // ignorăm duplicatele la import
        });
      }

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, count: data.length }));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON format' }));
    }
  });
}
// POST /import/csv — admin-only
if (pathname === '/import/csv' && req.method === 'POST') {
  if (!requireAdmin(session, res)) return;

  let body = '';
  req.on('data', chunk => body += chunk);
  return req.on('end', async () => {
    try {
      const lines = body.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const product = {};
        headers.forEach((h, idx) => product[h] = values[idx]);
        
        // parsează JSON-urile dacă există
        if (product.features) {
          try { product.features = JSON.parse(product.features); } catch {}
        }
        if (product.tags) {
          try { product.tags = JSON.parse(product.tags); } catch {}
        }

        await new Promise(resolve => {
          catalog.add(product, () => resolve());
        });
      }

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, count: lines.length - 1 }));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'CSV parsing failed' }));
    }
  });
}
// POST /search
if (pathname === '/search' && req.method === 'POST') {
  let body = '';
  req.on('data', c => body += c);
  return req.on('end', async () => {
    let q;
    try { q = JSON.parse(body); }
    catch {
      res.writeHead(400); return res.end(JSON.stringify({ error: 'Bad JSON' }));
    }
    const err3 = validate(q, { query: { required: true, type: 'string', minLength: 1 } });
    if (err3) {
      res.writeHead(400); return res.end(JSON.stringify({ error: err3 }));
    }
    const kw = q.query.trim().toLowerCase();

    // 1) cautare initiala in DB
    const dbRows = await catalog.searchByName(kw);
    const seen = new Set();
    const memory = dbRows.map(r => {
      seen.add(r.name.toLowerCase());
      let feats = r.features; if (typeof feats === 'string') try { feats = JSON.parse(feats); } catch {}
      let tags = r.tags; if (typeof tags === 'string') try { tags = JSON.parse(tags); } catch {}
      return { ...r, features: feats, tags, recommended: r.recommended };
    });

    // 2) scraping Cell + eMAG
    const [rawCell, rawEmag] = await Promise.all([
      scrapeCell(kw), scrapeEmag(kw)
    ]);

    // 3) combinam rezultatele brute
    const combinedRaw = [...rawEmag, ...rawCell];  // Produsele de la eMAG si Cell

    // 4) transformam & filtram duplicate
    const trans = combinedRaw
      .map(transformToProduct)
      .filter(p => p && !seen.has(p.name.toLowerCase()));

    // 5) salvam noile produse in DB si atribuim id-uri
    let emagCount = 0; // Numărul de produse de pe eMAG
    let cellCount = 0; // Numărul de produse de pe Cell

    // Asigură-te că stabilim corect `recommended` pentru fiecare produs
    for (const p of trans) {
      // Determinăm dacă este de la eMAG sau Cell
      if (p.recommended === 'emag') {
        emagCount++;
      } else if (p.recommended === 'cell') {
        cellCount++;
      }

      // Adăugăm produsul în DB
      await new Promise(resolve => {
        catalog.add(p, (err, newId) => {
          if (!err) {
            p.id = newId;
            seen.add(p.name.toLowerCase());
          }
          resolve();
        });
      });
    }

    // 6) actualizăm recomandările
    let emagLimit = Math.min(5, emagCount); // Primele produse adăugate vor fi emag
    let cellLimit = Math.min(5, cellCount); // Următoarele produse vor fi cell

    let count = 0;
    for (const p of trans) {
      if (count < emagLimit) {
        p.recommended = 'emag'; // Primele 5 produse de pe eMAG
      } else if (count >= emagLimit && count < emagLimit + cellLimit) {
        p.recommended = 'cell'; // Următoarele 5 produse de pe Cell
      }
      count++;

      // Apelăm metoda updateRecommended pentru a actualiza câmpul `recommended`
      await catalog.updateRecommended(p.id, p.recommended);
    }

    // 7) cautare extinsa in DB pe 3 nivele de relevanta
    const tokens = kw.split(/\s+/);
    const finalResults = [];
    const seenIds = new Set();

    async function searchPattern(pattern) {
      const rows = await catalog.searchByName(pattern);
      for (const r of rows) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          finalResults.push(r);
        }
      }
    }

    // nivel 1: expresia completa
    await searchPattern(`%${tokens.join(' ')}%`);
    // nivel 2: fara ultimul cuvant
    if (tokens.length > 1) {
      await searchPattern(`%${tokens.slice(0, -1).join(' ')}%`);
    }
    // nivel 3: primul cuvant
    await searchPattern(`%${tokens[0]}%`);

    // pregatim raspunsul final
    const output = finalResults.map(r => {
      let feats = r.features; if (typeof feats === 'string') try { feats = JSON.parse(feats); } catch {}
      let tags = r.tags; if (typeof tags === 'string') try { tags = JSON.parse(tags); } catch {}
      return { ...r, features: feats, tags, recommended: r.recommended };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(output));
  });
}


// POST /search
if (pathname === '/search' && req.method === 'POST') {
  let body = '';
  req.on('data', c => body += c);
  return req.on('end', async () => {
    let q;
    try { q = JSON.parse(body); }
    catch {
      res.writeHead(400); return res.end(JSON.stringify({ error: 'Bad JSON' }));
    }
    const err3 = validate(q, { query: { required: true, type: 'string', minLength: 1 } });
    if (err3) {
      res.writeHead(400); return res.end(JSON.stringify({ error: err3 }));
    }
    const kw = q.query.trim().toLowerCase();

    // 1) Căutare inițială în DB
    const dbRows = await catalog.searchByName(kw);
    const seen = new Set();
    const memory = dbRows.map(r => {
      seen.add(r.name.toLowerCase());
      let feats = r.features; if (typeof feats === 'string') try { feats = JSON.parse(feats); } catch {}
      let tags = r.tags; if (typeof tags === 'string') try { tags = JSON.parse(tags); } catch {}
      return { ...r, features: feats, tags, recommended: r.recommended };
    });

    // 2) scraping Cell + eMAG
    const [rawCell, rawEmag] = await Promise.all([
      scrapeCell(kw), scrapeEmag(kw)
    ]);

    // 3) Limităm la 25 produse de fiecare sursă
    const limitedRawEmag = rawEmag.slice(0, 25);
    const limitedRawCell = rawCell.slice(0, 25);

    // 4) Combinăm rezultatele brute
    const combinedRaw = [...limitedRawEmag, ...limitedRawCell];

    // 5) Transformăm & filtrăm duplicate
    const trans = combinedRaw
      .map(transformToProduct)
      .filter(p => p && !seen.has(p.name.toLowerCase()));

    // 6) Salvăm noile produse în DB și atribuim ID-uri
    let emagCount = 0; // Numărul de produse de pe eMAG
    let cellCount = 0; // Numărul de produse de pe Cell

    // Asigurăm corect atribuirea valorii 'recommended' pentru fiecare produs
    for (const p of trans) {
      // Determinăm dacă este de la eMAG sau Cell
      if (p.recommended === 'emag') {
        emagCount++;
      } else if (p.recommended === 'cell') {
        cellCount++;
      }

      // Adăugăm produsul în DB
      await new Promise(resolve => {
        catalog.add(p, (err, newId) => {
          if (!err) {
            p.id = newId;
            seen.add(p.name.toLowerCase());
          }
          resolve();
        });
      });
    }

    // 7) Actualizăm recomandările
    let emagLimit = Math.min(25, emagCount); // Primele 25 de produse de la eMAG
    let cellLimit = Math.min(25, cellCount); // Următoarele 25 de produse de la Cell

    let count = 0;
    for (const p of trans) {
      if (count < emagLimit) {
        p.recommended = 'emag'; // Primele produse sunt de la eMAG
      } else if (count < emagLimit + cellLimit) {
        p.recommended = 'cell'; // Următoarele produse sunt de la Cell
      }
      count++;

      // Apelăm metoda updateRecommended pentru a actualiza câmpul `recommended`
      await catalog.updateRecommended(p.id, p.recommended);
    }

    // 8) Căutare extinsă în DB pe 3 nivele de relevanță
    const tokens = kw.split(/\s+/);
    const finalResults = [];
    const seenIds = new Set();

    async function searchPattern(pattern) {
      const rows = await catalog.searchByName(pattern);
      for (const r of rows) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          finalResults.push(r);
        }
      }
    }

    // Nivel 1: expresia completă
    await searchPattern(`%${tokens.join(' ')}%`);
    // Nivel 2: fără ultimul cuvânt
    if (tokens.length > 1) {
      await searchPattern(`%${tokens.slice(0, -1).join(' ')}%`);
    }
    // Nivel 3: primul cuvânt
    await searchPattern(`%${tokens[0]}%`);

    // Pregătim răspunsul final
    const output = finalResults.map(r => {
      let feats = r.features; if (typeof feats === 'string') try { feats = JSON.parse(feats); } catch {}
      let tags = r.tags; if (typeof tags === 'string') try { tags = JSON.parse(tags); } catch {}
      return { ...r, features: feats, tags, recommended: r.recommended };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(output));
  });
}


  // GET /rss
if (pathname === '/rss' && req.method === 'GET') {
  const rows = await catalog.loadTop100();
  const rss  = generateRss(rows);
  res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
  return res.end(rss);
}

  // static file serving
  const rel = pathname==='/'?'index.html':pathname.slice(1)
  const fp  = path.join(staticRoot, rel)
  if (fs.existsSync(fp) && fs.lstatSync(fp).isFile()) {
    const ext = path.extname(fp).slice(1)
    const map = {html:'text/html',js:'application/javascript',
                 css:'text/css',png:'image/png',
                 jpg:'image/jpeg',svg:'image/svg+xml',
                 json:'application/json'}
    const ct = map[ext]||'application/octet-stream'
    res.writeHead(200,{ 'Content-Type': ct })
    return fs.createReadStream(fp).pipe(res)
  }

  // 404
  res.writeHead(404); res.end('404 Not Found')
})

const PORT = process.env.PORT || 9099;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
process.on('SIGINT', ()=> server.close(() => process.exit(0)))
