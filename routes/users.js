const express = require('express');

const auth = require('../controllers/auth');
const users = require('../controllers/users');
const { validationMiddleware } = require('../config/validators/user');

const router = express.Router();

router.use(auth.checkAuth);
router.use(auth.adminAccess);

router.get('/', users.getAllUsers);
router.get('/create', users.getCreate);
router.get('/:id', users.getUser);
router.post('/', validationMiddleware, users.createUser);
router.put('/:id', validationMiddleware, users.updateUser);
// router.delete('/:id');

module.exports = router;
