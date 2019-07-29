const PGclient = require('pg').Client;
const fs = require('fs');
const http = require('http');
const conf = require('../config');

const dir = `${__dirname}/..`;

const json2array = (json) => {
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
  client.query(query, (err, res) => {
    if (err) {
      return console.log(err);
    }
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
    callback(output);
    return client.end();
  });
};

// Copy the remote CSV locally
module.exports.store_csv = (sheet, type, callback) => {
  const csv = `${dir}/db/${sheet}-${type}.csv`;
  let remoteCSV = `http://${conf.server_host}:${conf.server_port}/`;
  remoteCSV += `get/remote/csv/${type}/${sheet}`;
  const file = fs.createWriteStream(csv);
  http.get(remoteCSV, (response) => {
    response.pipe(file);
    callback(null);
  });
};
