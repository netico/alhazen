const { Client } = require('pg');
const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const { sheets, connectionString } = require('../config');
const chartLib = require('../lib/views');

const nav = 'views';

function getViewSheets(type = null) {
  const cleanSheet = sheets.map(e => ({ type: e.type, name: e.name, db: e.db }));
  if (type) { return cleanSheet.filter(el => el.type === type); }
  return cleanSheet;
}

function json2array(json) {
  const result = [];
  const keys = Object.keys(json);
  keys.forEach((key) => {
    result.push(json[key]);
  });
  return result;
}

function createCsv(res) {
  const { rows } = res;
  const fields = json2array(res.fields);
  let c = 0;
  let output = '';
  // Headers
  const csvHeaders = [];
  csvHeaders.push('#');
  fields.forEach((column) => {
    csvHeaders.push(String(column.name));
  });
  output += `${csvHeaders.join(';')}\r\n`;
  rows.forEach((jsonRow) => {
    c += 1;
    let row = json2array(jsonRow);
    output += `${c};`;
    row = row.map((column) => {
      let csvItem;
      if (Number.isNaN(Number(column))) {
        // String or something else
        csvItem = String(column);
        csvItem = csvItem.trim();
        csvItem = csvItem.replace(';', ',');
      } else {
        // Number
        csvItem = +column;
        csvItem = csvItem.toString().replace('.', ',');
      }
      return csvItem;
    });
    output += row.join(';');
    output += '\r\n';
  });
  return output;
}


module.exports = {

  index: (req, res) => {
    const sheetsList = getViewSheets();
    res.render('views_home', { sheets: sheetsList, nav });
  },

  displayChart: (req, res) => {
    const { type, name } = req.params;
    const index = sheets.findIndex(e => e.type === type && e.name === name);
    if (index === -1) {
      res.redirect('/views');
      return;
    }
    const sheetsList = getViewSheets(type);
    const file = `./db/${name}-${type}.csv`;
    const title = type.split('-').reduce((tot, el) => {
      const str = el[0].toUpperCase() + el.slice(1, el.length);
      return `${tot} ${str}`;
    }, '').trim();
    fs.access(file, (err) => {
      if (err) {
        const error = `<p class="alert alert-primary">Local file not available. Please, try to <a href="/views/${type}/${name}/reload" class="alert-link">reload data</a>.</p>`;
        res.status(404).render('views_detail', {
          type, name, sheets: sheetsList, nav, error, title,
        });
        return;
      }
      csv({ delimiter: ';' }).fromFile(file).then((jsonObj) => {
        const data = chartLib[type.split('-').join('')](jsonObj);
        res.status(200).render('views_detail', {
          type, name, sheets: sheetsList, nav, title, data: JSON.stringify(data), error: undefined,
        });
      });
    });
  },

  reloadData: async (req, res) => {
    const { type, name } = req.params;
    const index = sheets.findIndex(e => e.type === type && e.name === name);
    if (index === -1) {
      res.redirect('/views');
      return;
    }
    const sheetsList = getViewSheets(type);
    const title = type.split('-').reduce((tot, el) => {
      const str = el[0].toUpperCase() + el.slice(1, el.length);
      return `${tot} ${str}`;
    }, '').trim();
    try {
      const client = new Client({
        connectionString: connectionString[sheets[index].db],
      });
      await client.connect();
      const result = await client.query(sheets[index].query);
      const file = `./db/${name}-${type}.csv`;
      const data = createCsv(result);
      fs.writeFile(file, data, (err) => {
        if (err) {
          const error = '<p class="alert alert-danger">Server error. Please, retry later.</p>';
          res.status(503).render('views_detail', {
            type, name, sheets: sheetsList, nav, title, error,
          });
          return;
        }
        res.redirect(`/views/${type}/${name}`);
      });
    } catch (e) {
      const error = '<p class="alert alert-danger">Server not reachable. Please, retry later.</p>';
      res.status(503).render('views_detail', {
        type, name, sheets: sheetsList, nav, title, error,
      });
    }
  },

  downloadCsv: (req, res) => {
    const { type, name } = req.params;
    const file = path.join(__dirname, `../db/${name}-${type}.csv`);
    res.header('Content-type: text/csv');
    res.download(file, 'download.csv', (err) => {
      if (err) {
        res.status(404).render('notfound', { error: 'Csv file not available. Please, try to reload data', nav });
      }
    });
  },

};
