const db = require('../DataBase/database')

class Product {
  constructor(id, name, type, price, battery, color, features, recommended, tags, image, popularity) {
    this.id = id
    this.name = name
    this.type = type
    this.price = price
    this.battery = battery
    this.color = color
    this.features = features
    this._recommended = recommended  
    this.tags = tags
    this.image = image
    this.popularity = popularity
  }

  get recommended() {
    return this._recommended
  }

  // setter care valideaza valoarea lui recommended
  set recommended(value) {
    const valid = ['emag', 'cell', 'deviceRec']
    if (valid.includes(value)) {
      this._recommended = value
    } else {
      throw new Error('Invalid recommended; valid: emag, cell, deviceRec')
    }
  }

  // returneaza un produs dupa id
  static findById(id) {
    return db.get('SELECT * FROM products WHERE id = ?', [id])
  }

  // returneaza toate produsele
  static findAll() {
    return db.all('SELECT * FROM products', [])
  }

  // adauga un nou produs in baza de date
  static create(data) {
    const {
      name, type, price, battery,
      color, features, recommended,
      tags, image, popularity
    } = data
    return db.run(
      `INSERT INTO products
        (name,type,price,battery,color,features,recommended,tags,image,popularity)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        type,
        price,
        battery,
        color,
        JSON.stringify(features || []),      // serializare features
        recommended || 'deviceRec',          
        JSON.stringify(tags || []),          // serializare tags
        image,
        popularity || 0                      // default popularitate
      ]
    )
  }

  // actualizeaza un produs existent
  static update(id, data) {
    const {
      name, type, price, battery,
      color, features, recommended,
      tags, image, popularity
    } = data
    return db.run(
      `UPDATE products SET
         name=?, type=?, price=?, battery=?, color=?,
         features=?, recommended=?, tags=?, image=?, popularity=?
       WHERE id=?`,
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

  static delete(id) {
    return db.run('DELETE FROM products WHERE id = ?', [id])
  }
}

module.exports = Product
