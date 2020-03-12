const logger = require('../config/logger');
const db = require('../config/db');

const nav = 'users';

module.exports = {
  getAllUsers: async (req, res) => {
    const text = 'SELECT * FROM users';
    const rows = await db.query(text);
    if (!rows) {
      logger.log('error', 'Error retriving all users from database.');
      const msgError = 'Error retrieving user list';
      return res.render('users', { error: msgError, nav, user: req.user });
    }
    return res.render('users', {
      users: rows, mode: 'list', nav, user: req.user, error: '',
    });
  },

  getUser: async (req, res) => {
    const text = 'SELECT * FROM users WHERE user_id = ?';
    const rows = await db.query(text, [req.params.id]);
    if (!rows) {
      logger.log('error', 'Error retriving user information ID: %s.', req.params.id);
      const msgError = 'Error retrieving user informations';
      return res.render('users', { error: msgError, nav, user: req.user });
    }
    if (rows.length > 0) {
      return res.render('users', {
        u: rows[0], mode: 'detail', nav, user: req.user, error: '',
      });
    }
    return res.redirect('/users');
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

    const text = 'INSERT INTO users(f_name, l_name, email, active) VALUES(?,?,?,?)';
    const result = await db.query(text, [fName, lName, email, active]);
    if (!result) {
      logger.log('error', 'Error creating the user.');
      return res.sendStatus(500);
    }
    return res.status(200).send({ success: true, data: { id: result.insertId } });
  },

  updateUser: async (req, res) => {
    const {
      userID, fName, lName, email, active,
    } = req.body;

    const text = 'UPDATE users SET f_name = ?, l_name = ?, email = ?, active = ? WHERE user_id = ?';
    const result = await db.query(text, [fName, lName, email, active, userID]);
    if (!result) {
      logger.log('error', 'Error updating the user %s - ID: %s.', email, userID);
      return res.sendStatus(500);
    }
    return res.status(200).send({ success: true, data: { affectedRows: result.affectedRows } });
  },
};
