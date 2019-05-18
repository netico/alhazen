const PGclient = require('pg').Client;
const CsvToJsonConverter = require('csvtojson').Converter;
const fs = require('fs');
const lodash = require('lodash');
const http = require('http');
const conf = require('./configuration');

const { sheets } = conf;

module.exports.json2array = (json) => {
  const result = [];
  const keys = Object.keys(json);
  keys.forEach((key) => {
    result.push(json[key]);
  });
  return result;
};
// Perform a query on the remote database and format the results in
// CSV format
// Requires a PostgreSQL backend
module.exports.get_csv = (config, query, callback) => {
  const client = new PGclient({
    connectionString: config,
  });
  client.connect();
  const thisObject = this;
  client.query(query, (err, res) => {
    if (err) {
      return console.log(err);
    }
    const { rows } = res;
    const fields = thisObject.json2array(res.fields);
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
      let row = thisObject.json2array(jsonRow);
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
          csvItem = column + 0;
          csvItem = csvItem.toString().replace('.', ',');
        }
        return csvItem;
      });
      output += row.join(';');
      output += '\r\n';
    });
    callback(output);
    return client.end();
  });
};
module.exports.get_local_json_straight_table_data = (sheet, type, callback) => {
  const csvFile = `${__dirname}/db/${sheet}-${type}.csv`;
  const converter = new CsvToJsonConverter({
    delimiter: ';',
  });
  converter.fromFile(csvFile).then((result) => {
    const json = result;
    const header = Object.keys(json[0]).map(el => ({
      data: el,
      title: el,
    }));
    callback({
      columns: header,
      data: json,
    });
  }).catch((err) => {
    if (err) {
      // Reload data if .csv doesn't exist
    }
  });
};
module.exports.get_local_json_bar_chart_data = (sheet, type, callback) => {
  const csvFile = `${__dirname}/db/${sheet}-${type}.csv`;
  const converter = new CsvToJsonConverter({
    delimiter: ';',
  });
  converter.fromFile(csvFile).then((result) => {
    const json = result.reduce((a, b) => {
      const c = Object.values(b);
      a.v.push(c[1].replace(',', '.'));
      a.k.push(c[2]);
      return a;
    }, { v: [], k: [] });
    callback(json);
  }).catch((err) => {
    if (err) {
      // Reload data if .csv doesn't exist
    }
  });
};
// Copy the remote CSV locally
module.exports.store_csv = (sheet, type, callback) => {
  const csv = `${__dirname}/db/${sheet}-${type}.csv`;
  let remoteCSV = `http://${conf.server_host}:${conf.server_port}/`;
  remoteCSV += `get/remote/csv/${type}/${sheet}`;
  const file = fs.createWriteStream(csv);
  http.get(remoteCSV, (response) => {
    response.pipe(file);
    callback(null);
  });
};

//* ***********   OLD   ********************************
module.exports.get_sheets_and_types = (filter) => {
  const result = [];
  const keys = Object.keys(conf.sheets);
  keys.forEach((key) => {
    result.push(sheets[key]);
  });
  const s = lodash.uniqBy(result, filter);
  const array = s.reduce((a, b) => {
    const c = Object.values(b);
    a.type.push(c[1]);
    a.name.push(c[2]);
    return a;
  }, { type: [], name: [] });
  return array;
};
