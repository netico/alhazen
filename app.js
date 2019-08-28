const express = require('express');
const path = require('path');

const indexRouter = require('./routes');
const viewsRouter = require('./routes/views');

const app = express();
const port = 5000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/views', viewsRouter);


app.listen(port, () => console.log(`Server start on port ${port}`));
