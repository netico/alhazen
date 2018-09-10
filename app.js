
library = require('./library');
conf = require('./conf');
//console.log(conf.modules['orders'].title);

/**********************************************************************/

// node.js
express = require('express');
pg_client = require('pg').Client;
ejs = require('ejs');
csvtojson_converter = require('csvtojson').Converter;

fs = require('fs');
http = require('http');

/**********************************************************************/

// App Express
app = express();
path = require('path');
app_path = path.join(__dirname) + '/';
app.use('/views', express.static(app_path + 'views'));
// HTTP Server
server = app.listen(process.env.PORT || conf.server_port, function () {
    port = server.address().port;
    console.log('Server started on port', port);
});
/**********************************************************************/

// Routing
app.get('/view', function (req, res) {

    parameter_module = req.query.module;
    switch (parameter_module) {

        case 'customers':
            query = 'select firstname as "First name", lastname as "Last name", city as "City", country as "Country", age as "Age", income as "Income" FROM customers';
            break;
        case 'orders':
			query = 'select o.orderid as "Number", date_part(\'year\', o.orderdate) as "Year", date_part(\'month\', o.orderdate) as "Month", to_char(o.orderdate, \'YYYY-MM-DD\') as "Date", concat (c.firstname, \' \', c.lastname) as "Customer", o.netamount as "Net amount", o.tax as "Tax", o.totalamount as "Total amount" from orders o left join customers c on o.customerid = c.customerid';		
            break;
        case 'orders-bar-chart':
			query = 'select sum(o.totalamount) as "Total amount" , to_char(o.orderdate, \'YYYY-MM\') as "Month" from orders o group by to_char(o.orderdate, \'YYYY-MM\') order by "Month"';
			break;
    }
    module(res, parameter_module, query, app, app_path);
});

// Home
app.get('/', function (req, res) {

    res.redirect('/view/?module=orders');
});

// Reload archives remotely and copy them locally
app.get('/reload', function (req, res) {

    parameter_module = req.query.module;
    switch (parameter_module) {
        case 'customers':
            library.store_csv(app_path, 'customers', function () {
                res.redirect('/view/?module=customers');
            });
            break;
        case 'orders':
            library.store_csv(app_path, 'orders', function () {
                res.redirect('/view/?module=orders');
            });
            break;
       case 'orders-bar-chart':
            library.store_csv(app_path, 'orders-bar-chart', function () {
                res.redirect('/view/?module=orders-bar-chart');
            });
            break;
        default:
            res.redirect('/');
    }

});
/**********************************************************************/

// Module
function module(res, archive, query, app, app_path) {

    // HTML
    res.render('template/modules/' + archive + '.ejs');
    // Reload the archive remotely
    app.get('/' + archive + '-remote.csv', function (req, res) {

        library.get_csv (conf.connection_string, query, function (CSV) {
            res.header('Content-type: text/csv');
            res.send(new Buffer(CSV));
        });
    });
    
    // Provides the local archive in CSV format
    app.get('/' + archive + '-local.csv', function (req, res) {

        res.header('Content-type: text/csv');
        res.sendFile(app_path + 'db/' + archive + '.csv');
    });
    
    // Provides the local archive in JSON format
    app.get('/' + archive + '-local.json', function (req, res) {

        library.get_json(app_path + 'db/' + archive + '.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json({data: JSON});
        });     
    });
    
    app.get('/' + archive + '-headers-local.json', function (req, res) {

        library.get_json_headers(app_path + 'db/' + archive + '.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
    
    app.get('/' + archive + '-bar-chart-local.json', function (req, res) {

        library.get_json_bar_chart(app_path + 'db/' + archive + '-bar-chart.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
    
}

/**********************************************************************/
