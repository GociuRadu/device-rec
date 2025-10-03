const db = require('../DataBase/database')
const ProductModel = require('./Product')

class Products {
  // Adauga un produs in baza de date si returneaza ID prin callback
  async add(product, callback) {
    try {
      const result = await ProductModel.create({
        name:        product.name,
        type:        product.type,
        price:       product.price,
        battery:     product.battery,
        color:       product.color,
        features:    product.features,
        recommended: product.recommended,
        tags:        product.tags,
        image:       product.image,
        popularity:  product.popularity
      })
      callback(null, result.lastID)
    } catch (err) {
      callback(err)
    }
  }

  // Returneaza toate produsele
  async getAll() {
    try {
      return await ProductModel.findAll()
    } catch (err) {
      console.error('Eroare la getAll:', err)
      throw err
    }
  }

  // Returneaza produsul cu ID-ul dat
  async getById(id) {
    try {
      return await ProductModel.findById(id)
    } catch (err) {
      console.error('Eroare la getById:', err)
      throw err
    }
  }

  // Cauta produse dupa fragment de nume
  async searchByName(keyword) {
    const pattern = `%${keyword}%`
    try {
      return await db.all(
        'SELECT * FROM products WHERE name LIKE ?',
        [pattern]
      )
    } catch (err) {
      console.error('Eroare la searchByName:', err)
      throw err
    }
  }

  // Actualizeaza toate campurile unui produs
  async update(id, fields) {
    try {
      await ProductModel.update(id, fields)
    } catch (err) {
      console.error('Eroare la update:', err)
      throw err
    }
  }

  // Sterge produsul cu ID-ul dat
  async delete(id) {
    try {
      await ProductModel.delete(id)
    } catch (err) {
      console.error('Eroare la delete:', err)
      throw err
    }
  }

  // Modifica doar campul recommended pentru un produs
  async updateRecommended(id, recommended) {
    try {
      return await db.run(
        'UPDATE products SET recommended = ? WHERE id = ?',
        [recommended, id]
      )
    } catch (err) {
      console.error('Eroare la updateRecommended:', err)
      throw err
    }
  }

  async loadTop100() {
    try {
      return await db.all(
        'SELECT * FROM products ORDER BY popularity DESC LIMIT 100',
        []
      )
    } catch (err) {
      console.error('Eroare la loadTop100:', err)
      throw err
    }
  }
}

module.exports = Products
