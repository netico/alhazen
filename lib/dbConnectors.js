const { promisify } = require('util');
const { Client } = require('pg');
const mysql = require('mysql');


exports.postgres = async (dbStr, queryStr) => {
  const client = new Client({
    connectionString: dbStr,
  });

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

exports.mysql = async (dbStr, queryStr) => {
  const connection = mysql.createConnection(dbStr);

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
