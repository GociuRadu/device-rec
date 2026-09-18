# device-rec — Electronics Catalog

A web application for browsing and managing a catalog of phones, tablets and laptops, built on Node.js **without a web framework** — routing, sessions and templating are handled by hand.

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?logo=puppeteer&logoColor=white)

**Live demo:** https://web-gociuradu-stativadarius.onrender.com

## Features

**For visitors**
- Search products by name
- Filter by product type, colour, maximum price and source
- Landing page with the 100 most popular products
- Popularity score increases automatically as products are viewed
- Export the current result set to JSON or CSV
- RSS feed of the catalog

**For administrators**
- Session-based authentication with separate user and admin roles
- Add, edit and delete products through an admin panel
- Import products automatically by scraping eMAG and CEL.ro with Puppeteer

## Architecture

```
BackEnd/
  server.js     # HTTP server, routing, static files
  login/        # authentication and session handling
  Products/     # catalog queries, filtering, export
  Scraper/      # Puppeteer scrapers for eMAG and CEL.ro
  DataBase/     # SQLite schema and access layer
  rss.js        # RSS feed generation
FrontEnd/       # HTML pages, CSS, client-side JavaScript
Documentatie/   # project documentation
```

Search is hybrid: results are served from the in-memory catalog first, and fall back to live scraping when the local data does not cover the query.

## Running locally

```bash
npm install
node BackEnd/server.js
```

Then open http://localhost:9099. Node.js and SQLite3 must be installed.

## Authors

Gociu Radu and Stativa Darius — Faculty of Computer Science, Alexandru Ioan Cuza University of Iași.
