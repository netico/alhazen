const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

const { usersDb } = require('../config');
const chartLib = require('../lib/views');
const { colors } = require('../config/colors');
const logger = require('../config/logger');
const dbConnectors = require('../lib/dbConnectors');
const defaultSettings = require('../config/chartDefaultSett');

const nav = 'views';

async function getSheets(userId = null, type = null, filterActive = false, groupType = false) {
  logger.log('info', 'CALL getSheets to retrieve sheets informations');
  let queryStr = `
    SELECT 
      v.view_name as viewName,
      v.view_api as viewApi,
      v.view_query as viewQuery,
      v.description as viewDescr,
      v.settings as settings,
      v.active as active,
      t.type_api_name as typeApi,
      t.type_name as typeName,
      d.db_name as dbName,
      d.db_type as dbType,
      d.connection_string as dbString
    FROM views v
    JOIN views_types t
      ON v.type = t.id
    JOIN dbs d
      ON v.source_db = d.id
  `;

  if (userId) {
    queryStr += ' JOIN views_users p ON v.view_id = p.view_id WHERE p.user_id = ?';
    if (filterActive) {
      queryStr += ' AND v.active = 1';
    }
  } else if (filterActive) {
    queryStr += ' WHERE v.active = 1';
  }

  const conn = await mariadb.createConnection(usersDb);
  let rows = await conn.query(queryStr, userId);
  conn.end();

  if (type) {
    rows = rows.filter(e => e.typeApi === type);
  }

  let result = rows;

  if (groupType) {
    const obj = {};
    result.forEach((sheet) => {
      if (obj[sheet.typeApi] === undefined) {
        obj[sheet.typeApi] = [];
      }
      obj[sheet.typeApi].push(sheet);
    });
    result = obj;
  }

  return result;
}

async function getUsers(viewApi) {
  logger.log('info', 'CALL getUsers to retrieve users');
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(
    `SELECT
      u.user_id,
      u.f_name,
      u.l_name,
      u.picture_link,
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
  logger.log('info', 'CALL getDatabases to retrieve dbs');
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

function createCsv(rows, rawFields) {
  const fields = json2array(rawFields);
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
      const sheetsList = await getSheets(req.user.id, null, true);
      return res.render('views_home', {
        sheets: sheetsList, nav, user: req.user, error: '',
      });
    } catch (err) {
      logger.log('error', 'Database failed on function getSheets(); Error: %s;', err.message);
      const error = 'An error occured loading the page! Please retry or contact your administrator';
      return res.status(500).render('views_home', {
        sheets: [], nav, user: req.user, error,
      });
    }
  },

  displayChart: async (req, res) => {
    const { type, name } = req.params;
    let sheetsList;
    try {
      sheetsList = await getSheets(req.user.id, type, true);
    } catch (err) {
      logger.log('error', 'Database failed on function getSheets(); Error: %s;', err.message);
      const error = '<div class="alert alert-danger">An error occured loading the page! Please retry or contact your administrator</div>';
      res.status(500).render('views_detail', {
        type, name, sheets: [], nav, error, user: req.user,
      });
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
        logger.log('info', 'CSV not available for view "%s_%s"', name, type);
        const error = `<div class="alert alert-primary">Local file not available. Please, try to <a href="/views/${type}/${name}/reload" class="alert-link">reload data</a>.</div>`;
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
      sheetsList = await getSheets(req.user.id, type, true);
    } catch (err) {
      logger.log('error', 'Database failed on function getSheets(); Error: %s;', err.message);
      const error = '<div class="alert alert-danger">An error occured loading the page! Please retry or contact your administrator</div>';
      res.status(500).render('views_detail', {
        type, name, sheets: [], nav, error, user: req.user,
      });
      return;
    }

    const index = sheetsList.findIndex(e => e.viewApi === name && e.typeApi === type);
    if (index === -1) {
      res.redirect('/views');
      return;
    }
    try {
      const sheet = sheetsList[index];
      const result = await dbConnectors[sheet.dbType](sheet.dbString, sheet.viewQuery);
      const file = `./db/${name}_${type}.csv`;
      const data = createCsv(result.rows, result.fields);
      fs.writeFile(file, data, (err) => {
        if (err) {
          logger.log('error', 'Error on writing csv file "%s_%s". Error: %s', name, type, err.message);
          const error = '<p class="alert alert-danger">Server error. Please, retry later.</p>';
          res.status(500).render('views_detail', {
            type, name, sheets: sheetsList, nav, error, user: req.user,
          });
          return;
        }
        res.redirect(`/views/${type}/${name}`);
      });
    } catch (e) {
      logger.log('error', 'Database failed reloading "%s_%s" view data. Error: %s', name, type, e.message);
      const error = '<p class="alert alert-danger">Server not reachable. Please, retry later.</p>';
      res.status(500).render('views_detail', {
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
        if (!res.headersSent) {
          res.status(404).render('notfound', { error: 'Csv file not available. Please, try to reload data', nav, user: req.user });
        }
        logger.log('error', 'Error downloading CSV file "%s_%s". Error: %s', name, type, err.message);
      }
    });
  },

  settings: async (req, res) => {
    let sheetsList;
    try {
      sheetsList = await getSheets(null, null, false, true);
    } catch (err) {
      logger.log('error', 'Database failed on function getSheets(); Error: %s;', err.message);
      const error = 'An error occured loading the page! Please retry or contact your administrator';
      return res.status(500).render('settings', {
        type: null, name: null, nav: '', user: req.user, sheets: {}, error,
      });
    }
    return res.render('settings', {
      type: null, name: null, nav: 'settings', user: req.user, sheets: sheetsList, error: '',
    });
  },

  settingsView: async (req, res) => {
    const { type, name } = req.params;
    let sheetsList;
    let dbs;
    let users;
    try {
      sheetsList = await getSheets(null, null, false, true);
      dbs = await getDatabases();
      users = await getUsers(name);
    } catch (err) {
      logger.log('error', 'Database failed; Error: %s;', err.message);
      const error = 'An error occured loading the page! Please retry or contact your administrator';
      return res.status(500).render('settings', {
        type, name, nav: '', user: req.user, error,
      });
    }
    const sheet = sheetsList[type].find(el => el.viewApi === name);
    return res.render('settings', {
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
      error: '',
      action: 'update',
    });
  },

  updateView: async (req, res) => {
    const { name, type } = req.params;
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
        logger.log('error', 'Database transaction failed during updateView "%s_%s"; Error: %s', name, type, e.message);
        return res.sendStatus(500);
      }
    } catch (err) {
      logger.log('error', 'Database connection failed during updateView "%s_%s"; Error: %s', name, type, err.message);
      return res.sendStatus(500);
    }
    await conn.commit();
    conn.end();
    logger.log('info', 'Successfully update view "%s_%s"', name, type);
    return res.sendStatus(200);
  },

  getCreate: async (req, res) => {
    const { type } = req.params;
    let dbs;
    let users;
    try {
      dbs = await getDatabases();
      users = await getUsers('null');
    } catch (error) {
      // Insert logger here
      console.log(error);
      res.sendStatus(500);
      return;
    }
    res.status(200).render(
      'create',
      {
        type,
        nav: 'settings',
        user: req.user,
        sheet: {
          viewName: '',
          active: true,
          dbName: '',
          settings: JSON.stringify(defaultSettings[type]),
        },
        colors: JSON.stringify(colors),
        dbs,
        users: {
          chips: users.filter(e => e.view_id !== null).map((e) => { delete e.view_id; return e; }),
          list: users.filter(e => e.view_id === null).map((e) => { delete e.view_id; return e; }),
        },
        action: 'create',
      },
    );
  },

  postCreate: async (req, res) => {

  },
};
