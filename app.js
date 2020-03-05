const httpContext = require('express-http-context');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const logger = require('./config/logger');
const { randomString } = require('./lib/utils');

const indexRouter = require('./routes');
const viewsRouter = require('./routes/views');
const usersRouter = require('./routes/users');

const app = express();

const port = config.server_port;
const host = config.server_host;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(httpContext.middleware);

app.use((req, res, next) => {
  httpContext.set('reqId', randomString(16));
  return next();
});

app.use((req, res, next) => {
  logger.log('info', 'recived %s - %s', req.method, req.originalUrl);
  return next();
});

app.use('/', indexRouter);
app.use('/views', viewsRouter);
app.use('/users', usersRouter);

app.listen(port, host, () => console.log(`Server start on port ${host}:${port}`));
