const sqlite3 = require('sqlite3').verbose()
const path    = require('path')

// --- CONFIGURARE ---
// fisierul bazei de date pentru utilizatori
const dbFile = path.join(__dirname, 'users.db')

// --- DESCHIDERE DB ---
// deschidem (sau cream) fisierul SQLite
const db = new sqlite3.Database(dbFile, err => {
  if (err) {
    console.error('Error opening users.db:', err.message)
    process.exit(1)
  }
})

// --- CREARE TABELA USERS ---
// se executa o singura data, la pornire
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
       id       INTEGER PRIMARY KEY AUTOINCREMENT,
       username TEXT    UNIQUE NOT NULL,
       password TEXT    NOT NULL,
       role     TEXT    CHECK(role IN ('user','admin')) NOT NULL DEFAULT 'user'
     )`,
    err => {
      if (err) console.error('Error creating users table:', err.message)
      else      console.log("Table 'users' is ready.")
      // inchidem conexiunea dupa creare
      db.close()
    }
  )
})
