const sqlite3 = require('sqlite3').verbose()
const path    = require('path')

// --- CONFIGURARE ---
// cale catre fisierul bazei de date pentru utilizatori
const dbPath = path.join(__dirname, 'users.db')

// --- INITIALIZARE CONEXIUNE ---
// deschidem (sau creem daca nu exista) baza de date SQLite
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Eroare la deschiderea users.db:', err.message)
    process.exit(1)
  }
})

// --- EXPORT METODE USERDAO ---
// metodele de mai jos folosesc Promises pentru a lucra asincron
module.exports = {

  findByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?'
      db.get(sql, [username], (err, row) => {
        if (err) return reject(err)
        resolve(row)  // row va fi obiectul utilizator sau undefined daca nu exista
      })
    })
  },

  // creeaza un utilizator nou
  createUser({ username, password, role = 'user' }) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
      db.run(sql, [username, password, role], function(err) {
        if (err) return reject(err)
        resolve({ lastID: this.lastID })  // intoarce id-ul inregistrarii noi
      })
    })
  }
}
