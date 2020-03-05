const mariadb = require('mariadb');

const logger = require('../config/logger');
const { usersDb } = require('../config/index');

const nav = 'users';

module.exports = {
  getAllUsers: async (req, res) => {
    try {
      const query = 'SELECT * FROM users';
      const conn = await mariadb.createConnection(usersDb);
      const rows = await conn.query(query);
      await conn.end();
      return res.render('users', {
        users: rows, mode: 'list', nav, user: req.user, error: '',
      });
    } catch (error) {
      logger.log('error', 'Error retriving all users from database. Error: %s', error.message);
      const msgError = 'Error retrieving user list';
      return res.render('users', { error: msgError, nav, user: req.user });
    }
  },

  getUser: async (req, res) => {
    try {
      const query = 'SELECT * FROM users WHERE user_id = ?';
      const conn = await mariadb.createConnection(usersDb);
      const rows = await conn.query(query, req.params.id);
      await conn.end();
      if (rows.length > 0) {
        return res.render('users', {
          u: rows[0], mode: 'detail', nav, user: req.user, error: '',
        });
      }
      return res.redirect('/users');
    } catch (error) {
      logger.log('error', 'Error retriving user information ID: %s. Error: %s', req.params.id, error.message);
      const msgError = 'Errore'; // modificare
      return res.render('users', { error: msgError, nav, user: req.user });
    }
  },

  getCreate: (req, res) => res.render('users', {
    u: {
      picture_link: null,
      f_name: '',
      l_name: '',
      email: '',
    },
    mode: 'create',
    nav,
    user: req.user,
    error: '',
  }),

  createUser: async (req, res) => {
    const {
      fName, lName, email, active,
    } = req.body;
    try {
      const query = 'INSERT INTO users(f_name, l_name, email, active) VALUES(?,?,?,?)';
      const conn = await mariadb.createConnection(usersDb);
      const { insertId } = await conn.query(query, [fName, lName, email, active]);
      return res.status(200).send({ success: true, data: { id: insertId } });
    } catch (err) {
      logger.log('error', 'Error creating the user. Error: %s', err.message);
      return res.sendStatus(500);
    }
  },

  updateUser: async (req, res) => {
    const {
      userID, fName, lName, email, active,
    } = req.body;
    try {
      const query = 'UPDATE users SET f_name = ?, l_name = ?, email = ?, active = ? WHERE user_id = ?';
      const conn = await mariadb.createConnection(usersDb);
      const { affectedRows } = await conn.query(query, [fName, lName, email, active, userID]);
      conn.end();
      res.status(200).send({ success: true, data: { affectedRows } });
    } catch (err) {
      logger.log('error', 'Error updating the user %s - ID: %s. Error: %s', email, userID, err.message);
      return res.sendStatus(500);
    }
  },

};
