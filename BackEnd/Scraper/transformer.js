/**
 * Curăță și normalizează un șir numeric de preț (3.699,99 Lei → 3699.99).
 */
function parsePrice(rawPrice) {
  if (!rawPrice || typeof rawPrice !== 'string') return null; // Dacă prețul este invalid sau nu este un string, returnăm null
  const m = rawPrice.replace(/[^\d.,]/g, '').match(/[\d.,]+/); // Eliminăm caracterele ne-numerice și căutăm numărul
  if (!m) return null; // Dacă nu găsim niciun număr, returnăm null
  let num = m[0].replace(/\./g, '').replace(',', '.'); // Înlocuim punctele și virgulele pentru a crea un număr valid
  const v = parseFloat(num); // Convertim în număr de tip float
  return isNaN(v) ? null : v; // Dacă nu este un număr valid, returnăm null
}

/**
 * Detectează tipul produsului din titlu.
 */
function inferType(name) {
  const l = name.toLowerCase(); // Convertim numele produsului la litere mici pentru comparații
  if (l.includes('iphone') || l.includes('galaxy') || l.includes('pixel') || l.includes('phone')||l.includes('telefon'))
    return 'smartphone'; // Dacă titlul conține cuvinte asociate cu telefoane, returnăm 'smartphone'
  if (l.includes('ipad') || l.includes('tablet')||l.includes('tableta')) return 'tablet'; // Dacă titlul conține cuvinte asociate cu tablete, returnăm 'tablet'
  if (l.includes('macbook') || l.includes('laptop')) return 'laptop'; // Dacă titlul conține cuvinte asociate cu laptopuri, returnăm 'laptop'
  if(l.includes('drona')) return 'drone';
  return 'other'; // Dacă nu se încadrează în nicio categorie, returnăm 'other'
}

/**
 * Extrage culoarea din specs sau titlu.
 */
function inferColor(name, specs) {
  const colorMap = {
    black: ['black', 'negru'],
    white: ['white', 'alb'],
    gray: ['gray', 'grey', 'gri'],
    blue: ['blue', 'albastru'],
    red: ['red', 'rosu', 'roșu'],
    green: ['green', 'verde'],
    yellow: ['yellow', 'galben'],
    gold: ['gold', 'auriu'],
    silver: ['silver', 'argintiu'],
    pink: ['pink', 'roz'],
    purple: ['purple', 'mov', 'violet'],
    orange: ['orange', 'portocaliu'],
    brown: ['brown', 'maro']
  };

  // 1) Căutăm culoarea în specificații
  for (const key of ['Color', 'Culoare', 'Nuanta']) {
    const val = specs[key]?.toLowerCase().trim();
    if (val) {
      for (const [baseColor, synonyms] of Object.entries(colorMap)) {
        if (synonyms.some(s => val.includes(s))) {
          return baseColor;
        }
      }
    }
  }

  // 2) Dacă nu am găsit în specs, căutăm în titlu
  const l = name.toLowerCase();
  for (const [baseColor, synonyms] of Object.entries(colorMap)) {
    if (synonyms.some(s => l.includes(s))) {
      return baseColor;
    }
  }

  return 'unknown';
}
/**
 * Extrage bateria (capacitate și tip) din specs.
 */
function inferBattery(specs) {
  const candidates = Object.entries(specs) // Obținem toate specificațiile produsului
    .filter(([k]) => /battery|baterie|capacitate/i.test(k)); // Filtrăm pentru a găsi câmpurile care conțin 'battery', 'baterie' sau 'capacitate'
  if (candidates.length) {
    // Preferăm cheia exactă „Capacitate baterie” sau „Battery capacity”
    const exact = candidates.find(([k]) => /capacitate/i.test(k)); // Căutăm cheia care conține 'capacitate'
    const [key, val] = exact || candidates[0]; // Dacă găsim cheia exactă, o folosim, altfel alegem prima opțiune
    return val.trim(); // Returnăm valoarea asociată cu cheia
  }
  return 'unknown'; // Dacă nu găsim nimic, returnăm 'unknown'
}

/**
 * Extrage câmpuri specifice de telefon, dacă există.
 */
function extractPhoneFields(specs) {
  const out = {}; // Obiect pentru a stoca câmpurile extrase

  // Verificăm dacă există informații despre camere
  if (specs['Numar camere'] || specs['Camera']) {
    out.cameraCount = specs['Numar camere'] || specs['Camera'];
  }
  // Verificăm dacă există informații despre rezoluția video
  if (specs['Rezolutie video'] || specs['Video Resolution']) {
    out.videoResolution = specs['Rezolutie video'] || specs['Video Resolution'];
  }
  // Verificăm dacă există informații despre standardul Wi-Fi
  if (specs['Standard Wi-Fi'] || specs['Wi-Fi Standard']) {
    out.wifiStandard = specs['Standard Wi-Fi'] || specs['Wi-Fi Standard'];
  }
  // Verificăm dacă există informații despre funcțiile display-ului
  if (specs['Functii display'] || specs['Display Features']) {
    out.displayFeatures = specs['Functii display'] || specs['Display Features'];
  }

  return out; // Returnăm câmpurile extrase
}

/**
 * Transformă un obiect brut într-un obiect de tip produs.
 */
function transformToProduct(raw) {
  if (!raw.title || !raw.url) return null;

  const name  = raw.title.trim();
  const type  = inferType(name);
  const specs = raw.specs || {};

  // 1) Preț (din raw.price sau din specs)
  let price = parsePrice(raw.price);
  if (price === null) {
    for (const key of ['Price','Preț','Lei','RON']) {
      if (specs[key]) {
        price = parsePrice(specs[key]);
        if (price !== null) break;
      }
    }
  }

  // 2) Baterie
  const battery = inferBattery(specs);
  // 3) Culoare
  const color = inferColor(name, specs);
  // 4) Extragem câmpurile specifice de telefon
  const phoneFields = extractPhoneFields(specs);
  // 5) Tag-uri standard
  const tags = Array.isArray(specs['__tags']) ? specs['__tags'] : [];

  // 6) Caracteristici = restul cheilor neprocesate
  // Definirea setului de câmpuri excluse
  const excluded = new Set([
    'Battery','Baterie','Color','Culoare','Nuanta','__tags',
    'Price','Preț','Lei','RON',
    'Numar camere','Camera','Rezolutie video','Video Resolution',
    'Standard Wi-Fi','Wi-Fi Standard','Functii display','Display Features'
  ]);

  const features = Object.entries(specs)
    .filter(([k,v]) => !excluded.has(k) && typeof v === 'string' && v.trim()) // Filtrăm câmpurile excluse
    .map(([k,v]) => `${k}: ${v.trim()}`); // Construim un array de caracteristici

  // Setăm câmpul `recommended` pe 'emag' pentru eMAG și 'cell' pentru Cell
  let recommended = 'deviceRec'; // Valoare implicită

  // Forțăm sursa pentru produsele de la eMAG și Cell
  if (raw.source === 'emag') {
    recommended = 'emag'; // Setăm pentru produsele de pe eMAG
  } else if (raw.source === 'cell') {
    recommended = 'cell'; // Setăm pentru produsele de pe Cell
  } else {
    // Verificăm și forțăm sursa, dacă nu a fost setată corect
    if (raw.url.includes("cel.ro")) {
      recommended = 'cell';
    } else if (raw.url.includes("emag.ro")) {
      recommended = 'emag';
    }
  }

  // Debug: verificăm sursa
  console.log(`Product ${raw.title} recommended as: ${recommended}`);

  return {
    id:             null,
    name,
    type,
    price,
    battery,
    color,
    ...phoneFields,
    features,
    recommended,    // Asigurăm că recomandarea este setată corect
    tags,
    image:          raw.image || null,
    popularity:     0,
    url:            raw.url
  };
}


module.exports = { transformToProduct }; // Exportăm funcția pentru a o folosi în alte module
