const { Client } = require('pg');
const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const { validationResult } = require('express-validator');

const { usersDb } = require('../config');
const chartLib = require('../lib/views');
const { colors } = require('../config/colors');

const nav = 'views';

async function getAllSheets() {
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(
    `SELECT 
      v.view_name as viewName,
      v.view_api as viewApi,
      v.view_query as viewQuery,
      v.description as viewDescr,
      v.settings as settings,
      v.active as active,
      t.type_api_name as typeApi,
      t.type_name as typeName,
      d.db_name as dbName,
      d.connection_string as dbString
    FROM views v
    JOIN views_types t
      ON v.type = t.id
    JOIN dbs d
      ON v.source_db = d.id;`,
  );
  conn.end();
  if (rows.length > 0) {
    const result = {};
    rows.forEach((sheet) => {
      if (result[sheet.typeApi] === undefined) {
        result[sheet.typeApi] = [];
      }
      result[sheet.typeApi].push(sheet);
    });
    return result;
  }
  return [];
}

async function getViewSheets(userId, type = null) {
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(
    `SELECT 
      v.view_name as viewName,
      v.view_api as viewApi,
      v.view_query as viewQuery,
      v.description as viewDescr,
      v.settings as settings,
      v.active as active,
      t.type_api_name as typeApi,
      t.type_name as typeName,
      d.db_name as dbName,
      d.connection_string as dbString
    FROM views v
    JOIN views_users p
      ON v.view_id = p.view_id
    JOIN views_types t
      ON v.type = t.id
    JOIN dbs d
      ON v.source_db = d.id
    WHERE p.user_id = ? AND v.active = 1;`,
    userId,
  );
  conn.end();
  if (rows.length > 0) {
    let result = rows;
    if (type) {
      result = rows.filter(e => e.typeApi === type);
    }
    return result;
  }
  return [];
}

async function getUsers(viewApi) {
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(
    `SELECT
      u.user_id,
      u.f_name,
      u.l_name,
      vu.view_id
    FROM users u
    LEFT JOIN (
      SELECT *
      FROM views_users 
      WHERE view_id = (
        SELECT view_id
        FROM views
        WHERE view_api = ?)
    ) as vu
    ON u.user_id = vu.user_id;`,
    viewApi,
  );
  conn.end();
  if (rows.length > 0) {
    return rows;
  }
  throw new Error('Error select users');
}

async function getDatabases() {
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(
    `SELECT 
      id,
      db_name
    FROM dbs`,
  );
  conn.end();
  if (rows.length > 0) {
    return rows;
  }
  throw new Error('Error select dbs');
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

  index: async (req, res) => {
    try {
      const sheetsList = await getViewSheets(req.user.id);
      res.render('views_home', { sheets: sheetsList, nav, user: req.user });
      return;
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  },

  displayChart: async (req, res) => {
    const { type, name } = req.params;
    let sheetsList;
    try {
      sheetsList = await getViewSheets(req.user.id, type);
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }

    const index = sheetsList.findIndex(e => e.viewApi === name && e.typeApi === type);
    if (index === -1) {
      res.redirect('/views');
      return;
    }

    sheetsList[index].settings = JSON.parse(sheetsList[index].settings);

    const file = `./db/${name}_${type}.csv`;
    fs.access(file, (err) => {
      if (err) {
        const error = `<p class="alert alert-primary">Local file not available. Please, try to <a href="/views/${type}/${name}/reload" class="alert-link">reload data</a>.</p>`;
        res.status(404).render('views_detail', {
          type, name, sheets: sheetsList, nav, error, user: req.user,
        });
        return;
      }
      csv({ delimiter: ';' }).fromFile(file).then((jsonObj) => {
        const libType = type.split('-').join('');
        const data = chartLib[libType](jsonObj, sheetsList[index]);
        res.status(200).render('views_detail', {
          type,
          name,
          sheets: sheetsList,
          nav,
          user: req.user,
          data: JSON.stringify(data.result),
          error: data.error,
        });
      });
    });
  },

  reloadData: async (req, res) => {
    const { type, name } = req.params;
    let sheetsList;
    try {
      sheetsList = await getViewSheets(req.user.id, type);
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }

    const index = sheetsList.findIndex(e => e.viewApi === name && e.typeApi === type);
    if (index === -1) {
      res.redirect('/views');
      return;
    }

    try {
      const client = new Client({
        connectionString: sheetsList[index].dbString,
      });
      await client.connect();
      const result = await client.query(sheetsList[index].viewQuery);
      const file = `./db/${name}_${type}.csv`;
      const data = createCsv(result);
      fs.writeFile(file, data, (err) => {
        if (err) {
          const error = '<p class="alert alert-danger">Server error. Please, retry later.</p>';
          res.status(503).render('views_detail', {
            type, name, sheets: sheetsList, nav, error, user: req.user,
          });
          return;
        }
        res.redirect(`/views/${type}/${name}`);
      });
    } catch (e) {
      const error = '<p class="alert alert-danger">Server not reachable. Please, retry later.</p>';
      res.status(503).render('views_detail', {
        type, name, sheets: sheetsList, nav, error, user: req.user,
      });
    }
  },

  downloadCsv: (req, res) => {
    const { type, name } = req.params;
    const file = path.join(__dirname, `../db/${name}_${type}.csv`);
    res.header('Content-type: text/csv');
    res.download(file, 'download.csv', (err) => {
      if (err) {
        res.status(404).render('notfound', { error: 'Csv file not available. Please, try to reload data', nav, user: req.user });
      }
    });
  },

  settings: async (req, res) => {
    let sheetsList;
    try {
      sheetsList = await getAllSheets();
    } catch (error) {
      res.sendStatus(500);
      return;
    }
    res.render('settings', {
      type: null,
      name: null,
      nav: 'settings',
      user: req.user,
      sheets: sheetsList,
    });
  },

  settingsView: async (req, res) => {
    const { type, name } = req.params;
    let sheetsList;
    let dbs;
    let users;
    try {
      sheetsList = await getAllSheets();
      dbs = await getDatabases();
      users = await getUsers(name);
    } catch (error) {
      res.sendStatus(500);
      return;
    }
    const sheet = sheetsList[type].find(el => el.viewApi === name);
    res.render('settings', {
      type,
      name,
      nav: 'settings',
      user: req.user,
      sheets: sheetsList,
      sheet,
      colors: JSON.stringify(colors),
      dbs,
      users: {
        chips: users.filter(e => e.view_id !== null).map((e) => { delete e.view_id; return e; }),
        list: users.filter(e => e.view_id === null).map((e) => { delete e.view_id; return e; }),
      },
    });
  },

  updateView: async (req, res) => {
    const { name } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() });
      return;
    }
    const { info, settings } = req.body;
    const users = info.users.map(e => [name, e.user_id]);
    let conn;
    try {
      conn = await mariadb.createConnection(usersDb);
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM views_users WHERE view_id = (SELECT view_id FROM views WHERE view_api = ?)', name);
        await conn.batch('INSERT INTO views_users(view_id, user_id) VALUES((SELECT view_id FROM views WHERE view_api = ?),?)', users);
        await conn.query(
          `UPDATE
            views
          SET
            view_name = ?,
            description = ?,
            active = ?,
            view_query = ?,
            source_db = ?,
            settings = ?
          WHERE
            view_api = ?;`,
          [
            info.viewName,
            info.description,
            info.active,
            info.view_query,
            info.source_db,
            JSON.stringify(settings),
            name,
          ],
        );
      } catch (e) {
        await conn.rollback();
        res.sendStatus(500);
        return;
      }
    } catch (err) {
      res.sendStatus(500);
      return;
    }
    await conn.commit();
    conn.end();
    res.sendStatus(200);
  },

};
