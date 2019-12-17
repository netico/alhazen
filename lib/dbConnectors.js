const { promisify } = require('util');
const { Client } = require('pg');
const mysql = require('mysql');


exports.postgres = async (dbStr, queryStr) => {
  const client = new Client({
    connectionString: dbStr,
  });
  await client.connect();
  const result = await client.query(queryStr);
  client.end();
  return result;
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
  await connect();
  const { results, fields } = await query(queryStr, connection);
  connection.end();
  return { rows: results, fields };
};
