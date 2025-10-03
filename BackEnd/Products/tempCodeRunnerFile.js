const Products = require('./Products'); 
const Product = require('./Product'); 

const catalog = new Products();

setTimeout(() => {
  const sampleProducts = [
    new Product(
      null,
      'Smartphone Alpha X1',
      'smartphone',
      1299.99,
      '4000mAh',
      'black',
      JSON.stringify(['5G', 'dual-sim', 'OLED display']),
      'emag',  // Valid value for 'recommended'
      JSON.stringify(['android', 'flagship']),
      'https://exemplu.com/images/alpha_x1.jpg',
      50
    ),
    new Product(
      null,
      'Smartphone Beta Y2',
      'smartphone',
      1099.99,
      '3500mAh',
      'blue',
      JSON.stringify(['4G', 'dual-sim', 'IPS display']),
      'cell', 
      JSON.stringify(['android', 'budget']),
      'https://exemplu.com/images/beta_y2.jpg',
      30
    ),
    new Product(
      null,
      'Smartphone Gamma Z3',
      'smartphone',
      999.99,
      '3000mAh',
      'white',
      JSON.stringify(['3G', 'single-sim', 'LCD display']),
      'deviceRec',  
      JSON.stringify(['android', 'entry-level']),
      'https://exemplu.com/images/gamma_z3.jpg',
      40
    ),
  ];

  let inserted = 0;
  sampleProducts.forEach(prod => {
    catalog.add(prod, (err, newId) => { 
      if (err) {
        console.error('Failed to insert:', prod.name, err.message);
      } else {
        console.log(`Produs inserat cu id=${newId}: ${prod.name}`);
      }
      inserted++;
      if (inserted === sampleProducts.length) {
        console.log('Toate produsele au fost inserate.');
        process.exit(0);
      }
    });
  });
}, 200);
