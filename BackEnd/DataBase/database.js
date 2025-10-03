const sqlite3 = require('sqlite3').verbose()
const path    = require('path')

// --- CONFIGURATIE ---
// calea catre fisierul sqlite
const databaseFile = path.join(__dirname, 'products.db')

// --- CONEXIUNE ---
// deschide (sau creeaza) baza de date
const db = new sqlite3.Database(databaseFile, err => {
  if (err) {
    console.error('Failed to open database:', err.message)
    process.exit(1)
  }
  console.log('Database opened at', databaseFile)
})

//Transforma apelurile callback-based în Promises
//Normalizeaza datele (transformă array-uri în JSON)

// --- INTERFATA PROMISE-URI ---
// wrapper pentru INSERT/UPDATE/DELETE
module.exports = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err)
        resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  },

  // wrapper pentru SELECT care returneaza un singur rand
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err)
        resolve(row)
      })
    })
  },

  // wrapper pentru SELECT care returneaza toate randurile
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  },

  // --- METODE PENTRU PRODUSE ---
  // adauga un produs nou
  addProduct(data) {
    const { name, type, price, battery, color, features, recommended, tags, image, popularity } = data
    return this.run(
      `INSERT INTO products
         (name, type, price, battery, color, features, recommended, tags, image, popularity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        type,
        price,
        battery,
        color,
        JSON.stringify(features || []),
        recommended || 'deviceRec',
        JSON.stringify(tags || []),
        image,
        popularity || 0
      ]
    )
  },

  // actualizeaza un produs existent
  updateProduct(id, data) {
    const { name, type, price, battery, color, features, recommended, tags, image, popularity } = data
    return this.run(
      `UPDATE products SET
         name = ?, type = ?, price = ?, battery = ?, color = ?,
         features = ?, recommended = ?, tags = ?, image = ?, popularity = ?
       WHERE id = ?`,
      [
        name,
        type,
        price,
        battery,
        color,
        JSON.stringify(features || []),
        recommended || 'deviceRec',
        JSON.stringify(tags || []),
        image,
        popularity || 0,
        id
      ]
    )
  }
}
