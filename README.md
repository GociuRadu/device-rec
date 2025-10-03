Proiect: Catalog Produse - Aplicatie Web

Descriere:
Aceasta aplicatie web permite gestionarea si explorarea unui catalog de produse electronice precum telefoane, tablete sau laptopuri.
Utilizatorii pot cauta si filtra produse, iar administratorii au acces la functionalitati de modificare si stergere.
Datele despre produse pot fi adaugate manual sau obtinute automat prin scraping de pe site-uri externe (eMAG si CEL.ro).

Demo online:
Aplicatia este disponibila si online la urmatoarea adresa:
https://web-gociuradu-stativadarius.onrender.com

Functionalitati principale:

- Cautare produse dupa nume 
- Filtrare dupa:
    * Tip produs (smartphone, laptop etc.)
    * Culoare
    * Pret maxim
    * Sursa produsului: emag / cell /
- Vizualizare cele mai populare 100 produse (ordonate dupa popularitate)
- Cresterea automata a popularitatii unui produs cand este accesat
- Export al tuturor produselor in format JSON si CSV
- Autentificare utilizatori si administratori
- Protejare operatii sensibile (editare, stergere) prin verificarea rolului admin
- Interfata separata pentru administratori 
- Suport pentru scraping de produse de pe eMAG si CEL.ro
- Generare RSS cu cele mai recente produse

Tehnologii utilizate:

- Backend: Node.js , SQLite
- Frontend: HTML, CSS, JavaScript 
- Web scraping: Puppeteer
- Baza de date: SQLite3 


Structura proiectului:

- BackEnd/
    * server.js - serverul HTTP principal
    * login/ - gestionare conturi si autentificare
    * Products/ - clasa Products, metode CRUD si cautare
    * Scraper/ - logica pentru scraping eMAG si CEL.ro
    * DataBase/ - scripturi pentru creare baza de date
    * rss.js - generare feed RSS

- FrontEnd/
    * index.html - pagina principala cu filtre si cautare
    * login.html - pagina autentificare
    * edit.html - formular editare produs (admin)
    * product.html - afisare detalii produs
    * style.css - stiluri
    * script.js - functionalitate cautare, filtre, UI

Cum se ruleaza aplicatia:

1. Asigura-te ca ai instalat Node.js si SQLite3
2. Instaleaza dependintele : `npm install`
3. Porneste serverul: `node BackEnd/server.js`
4. Acceseaza aplicatia in browser: http://localhost:9099

Autori:
- Gociu Radu
- Stativa Darius
 
Universitatea "Alexandru Ioan Cuza" din Iasi  
Facultatea de Informatica  
Proiect pentru disciplina Tehnologii Web
