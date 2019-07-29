// node.js
const express = require('express');
const lodash = require('lodash');
const path = require('path');
const conf = require('./config');
const library = require('./lib/library');
const chartData = require('./lib/chart_data');

const { sheets } = conf;
/** ******************************************************************* */

// App Express
const app = express();
const appPath = `${path.join(__dirname)}/`;
// app.use('/views', express.static(`${appPath}views`));
app.use(express.static('assets'));
app.use(express.static('db'));
app.set('view engine', 'ejs');
app.set('views', './views');

const server = app.listen(process.env.PORT || conf.server_port, () => {
  const { port } = server.address();
  console.log('Server started on port', port);
});

/** ******************************************************************* */

// Routing
app.get('/view/:type/:sheet', (req, res) => {
  const { type } = req.params;
  // HTML template
  res.render(`template/types/${type}.ejs`);
});

app.get('/get/remote/csv/:type/:sheet', (req, res) => {
  const { sheet, type } = req.params;
  const item = lodash.find(sheets, { name: sheet, type });
  library.get_csv(conf.connection_string[item.db], item.query, (CSV) => {
    res.header('Content-type: text/csv');
    res.send(Buffer.from(CSV));
  });
});

app.get('/get/local/csv/:type/:sheet', (req, res) => {
  const { sheet, type } = req.params;
  const dbCSV = `${appPath}db/${sheet}-${type}.csv`;
  res.header('Content-type: text/csv');
  res.sendFile(dbCSV);
});

// Get data
app.get('/get/local/json/:type/data/:sheet', (req, res) => {
  const { sheet, type } = req.params;
  const chart = type.replace('-', '_');
  chartData[`get_local_json_${chart}_data`](sheet, type, (JSON) => {
    res.header('Content-type: text/json');
    res.json(JSON);
  });
});

// Home
// app.get('/', (req, res) => {
//   const { type } = sheets[1];
//   const sheet = sheets[1].name;
//   // redirect to first available query
//   res.redirect(`/view/${type}/${sheet}`);
// });

app.get('/', (req, res) => {
  res.render('template/pages/home.ejs');
});

app.get('/get/conf/sheets/:type?', (req, res) => {
  const { type } = req.params;
  const cleanSheets = sheets.map(e => ({ type: e.type, name: e.name, db: e.db }));
  if (type === undefined) {
    res.json(cleanSheets);
  } else {
    const arr = cleanSheets.filter(el => el.type === type);
    res.json(arr);
  }
});

// Populate navbar menu
app.get('/get/nav', (req, res) => {
  const keys = Object.keys(sheets);
  const array = [];
  keys.forEach((key) => {
    array.push({ type: sheets[key].type, name: sheets[key].name });
  });
  const result = lodash.groupBy(array, 'type');
  res.header('Content-type: text/json');
  res.json(result);
});

// Reload sheets remotely and copy them locally
app.get('/reload/:type/:sheet', (req, res) => {
  const { sheet, type } = req.params;
  library.store_csv(sheet, type, () => {
    res.redirect(`/view/${type}/${sheet}`);
  });
});
