const { promisify } = require('util');
const { Client } = require('pg');
const fs = require('fs');
const mysql = require('mysql');

function validateOptions(options) {
  try {
    const obj = JSON.parse(options);

    if (Object.prototype.hasOwnProperty.call(obj, 'ssl')) {
      const files = ['ca', 'key', 'cert'];
      const keys = Object.keys(obj.ssl);

      keys.forEach((key) => {
        if (files.includes(key)) {
          obj.ssl[key] = fs.readFileSync(obj.ssl[key], 'utf-8');
        }
      });
    }

    return obj;
  } catch (error) {
    return options;
  }
}

exports.postgres = async (options, queryStr) => {
  let opt = validateOptions(options);

  if (typeof opt !== 'object') {
    opt = { connectionString: options };
  }

  const client = new Client(opt);

  let conn;
  let results;

  try {
    conn = await client.connect();
    results = await client.query(queryStr);
  } catch (error) {
    throw error;
  } finally {
    if (conn) client.end();
  }

  return results;
};

exports.mysql = async (options, queryStr) => {
  const opt = validateOptions(options);
  const connection = mysql.createConnection(opt);

  const connect = promisify(connection.connect).bind(connection);

  const query = (string, conn) => new Promise((resolve, reject) => {
    conn.query(string, (err, results, fields) => {
      if (err) reject(err);
      else resolve({ results, fields });
    });
  });

  let conn;
  let res;

  try {
    conn = await connect();
    res = await query(queryStr, connection);
  } catch (error) {
    throw error;
  } finally {
    if (conn) connection.end();
  }

  return { rows: res.results, fields: res.fields };
};
