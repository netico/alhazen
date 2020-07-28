const mariadb = require('mariadb');

const { usersDb } = require('../config');
const logger = require('../config/logger');

usersDb.connectionLimit = 5;
const pool = mariadb.createPool(usersDb);

module.exports = {
  query: async (text, params = []) => {
    let conn;
    try {
      if (!Array.isArray(params)) {
        throw new Error("params isn't an Array");
      }
      conn = await pool.getConnection();
      // multi-insert query use batch method
      let res;
      if (params && Array.isArray(params[0])) {
        res = await conn.batch(text, params);
      } else {
        res = await conn.query(text, params);
      }
      return res;
    } catch (e) {
      logger.log('error', 'Query failed; Error: %s', text, e.message);
      return false;
    } finally {
      if (conn) conn.release();
    }
  },
};
