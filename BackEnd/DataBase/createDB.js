const sqlite3 = require('sqlite3').verbose()
const path    = require('path')

// --- CONFIGURARE Cale fisier ---
const databaseFile = path.join(__dirname, 'products.db')

// --- INITIALIZARE CONEXIUNE ---
const db = new sqlite3.Database(databaseFile, err => {
  if (err) {
    console.error('Eroare la deschiderea bazei de date:', err.message)
    process.exit(1)
  }
  console.log('Baza de date deschisă la', databaseFile)
})

// --- CREARE TABEL & ÎNCHIDERE CONEXIUNE ---
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT,
      type        TEXT,
      price       REAL,
      battery     TEXT,
      color       TEXT,
      features    TEXT,
      recommended TEXT DEFAULT 'deviceRec',
      tags        TEXT,
      image       TEXT,
      popularity  INTEGER
    )`,
    err => console.log(err ? 'Eroare creare tabel:' + err.message : 'Tabelul products este gata.')
  )

  db.close(err => console.log(err ? 'Eroare la închidere:' + err.message : 'Conexiunea a fost închisă.'))
})
