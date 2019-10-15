const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');

const indexRouter = require('./routes');
const viewsRouter = require('./routes/views');

const app = express();

const port = config.server_port;
const host = config.server_host;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.use('/views', viewsRouter);

app.listen(port, host, () => console.log(`Server start on port ${host}:${port}`));
