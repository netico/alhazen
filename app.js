
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
app.get('/view/:sheet', function (req, res) {

    sheet = req.params.sheet;
    switch (sheet) {

        case 'customers':
            query = 'select firstname as "First name", lastname as "Last name", city as "City", country as "Country", age as "Age", income as "Income" FROM customers';
            type = 'straight-table';
            break;
        case 'orders':
			query = 'select o.orderid as "Number", date_part(\'year\', o.orderdate) as "Year", date_part(\'month\', o.orderdate) as "Month", to_char(o.orderdate, \'YYYY-MM-DD\') as "Date", concat (c.firstname, \' \', c.lastname) as "Customer", o.netamount as "Net amount", o.tax as "Tax", o.totalamount as "Total amount" from orders o left join customers c on o.customerid = c.customerid';		
            type = 'straight-table';
            break;
        case 'orders-bar-chart':
			query = 'select sum(o.totalamount) as "Total amount" , to_char(o.orderdate, \'YYYY-MM\') as "Month" from orders o group by to_char(o.orderdate, \'YYYY-MM\') order by "Month"';
			type = 'bar-chart';
			break;
    }
    //module(res, parameter_module, query, app, app_path);
	route (res, sheet, query, app, app_path, type);
});

// Home
app.get('/', function (req, res) {

    res.redirect('/view/orders');
});


// Reload sheets remotely and copy them locally
app.get('/reload/:sheet', function (req, res) {

	sheet = req.params.sheet;
	library.store_csv(app_path, sheet, function () {
		res.redirect('/view/' + sheet);
	});
	
});

/**********************************************************************/

function route (res, sheet, query, app, app_path, type) {

    // HTML
    res.render('template/types/' + type + '.ejs');
    
    // Reload the sheet remotely
    app.get('/get/remote/csv/' + sheet, function (req, res) {

        library.get_csv (conf.connection_string, query, function (CSV) {
			
            res.header('Content-type: text/csv');
            res.send(new Buffer(CSV));
        });
    });
    
    // Provides the local sheet in CSV format
    app.get('/get/local/csv/' + sheet, function (req, res) {

        res.header('Content-type: text/csv');
        res.sendFile(app_path + 'db/' + sheet + '.csv');
    });
    
    // Provides the local sheet in JSON format
    app.get('/get/local/json/straight-table/data/' + sheet, function (req, res) {

        library.get_local_json_straight_table_data(app_path + 'db/' + sheet + '.csv', function (JSON) {
			
            res.header('Content-type: text/json');
            res.json({data: JSON});
        });     
    });
    
    app.get('/get/local/json/straight-table/headers/' + sheet, function (req, res) {

        library.get_local_json_straight_table_headers(app_path + 'db/' + sheet + '.csv', function (JSON) {
			
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
    
    app.get('/get/local/json/bar-chart/data/' + sheet, function (req, res) {

        library.get_local_json_bar_chart_data(app_path + 'db/' + sheet + '.csv', function (JSON) {
			
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
}
