

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
        case 'orders-trend-chart':
			query = 'select sum(o.totalamount) as "Total amount" , to_char(o.orderdate, \'YYYY-MM\') as "Month" from orders o group by to_char(o.orderdate, \'YYYY-MM\')';
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
            store_csv(app_path, 'customers', function () {
                res.redirect('/view/?module=customers');
            });
            break;
        case 'orders':
            store_csv(app_path, 'orders', function () {
                res.redirect('/view/?module=orders');
            });
            break;
       case 'orders-trend-chart':
            store_csv(app_path, 'orders-trend-chart', function () {
                res.redirect('/view/?module=orders-trend-chart');
            });
            break;
        default:
            res.redirect('/');
    }

});
/**********************************************************************/


// Functions
function json2array(json) {
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function (key) {
        result.push(json[key]);
    });
    return result;
}

// Module
function module(res, archive, query, app, app_path) {

    // HTML
    res.render('template/modules/' + archive + '.ejs');
    // Reload the archive remotely
    app.get('/' + archive + '-remote.csv', function (req, res) {

        get_csv(conf.connection_string, query, function (CSV) {
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

        get_json(app_path + 'db/' + archive + '.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json({data: JSON});
        });     
    });
    
    app.get('/' + archive + '-headers-local.json', function (req, res) {

        get_json_headers(app_path + 'db/' + archive + '.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
    
    app.get('/' + archive + '-bar-chart-local.json', function (req, res) {

        get_json_bar_chart(app_path + 'db/' + archive + '.csv', function (JSON) {
            res.header('Content-type: text/json');
            res.json(JSON);
        });
    });
    
}

// Perform a query on the remote database and format the results in
// CSV format
// Requires a PostgreSQL backend
function get_csv(config, query, callback) {

    var client = new pg_client({
		connectionString: config
    });

    client.connect();
    client.query(query, function (err, res) {

		//console.log(err)
        rows = res.rows;
        fields = json2array(res.fields);
        c = 0;
        output = '';

        // Headers
        csv_headers = [];

        csv_headers.push ('#');
        fields.forEach(function (column) {

            csv_headers.push (String(column.name));
        });
        output += csv_headers.join (';') + '\r\n';


        rows.forEach(function (json_row) {
            c++;
            row = json2array(json_row);

            output += c + ';';
            
            row = row.map (function (column) {
                if (isNaN(column)) {
                    // String or something else
                    csv_item = String(column);
                    csv_item = csv_item.trim();
                    csv_item = csv_item.replace(';', ',');

                } else {
                    // Number
                    csv_item = column + 0;
                    csv_item = csv_item.toString().replace('.', ',');
                }
				return csv_item;
            });
            
            output += row.join (';');
            output += '\r\n';
        });
        callback(output);

        client.end();
    });

}

function get_json (csv_file, callback) {
	
	var converter = new csvtojson_converter({
		delimiter: ';'
	});
	
	converter.fromFile(csv_file).then ( function (result) 
	{

		var json = result;
		callback(json);
	})
	.catch ( function (err) {
		if(err){
			console.log("An error has occured");
			console.log(err);  
		}
	});
}

function get_json_headers (csv_file, callback) {
	
	fs.readFile(csv_file, 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
		}
		lines = data.split(/\r\n|\r|\n/);
		
		// creates columns by splitting first line of csv
		columns = lines[0].split(';');
		callback (columns.map (function (item) {
			return {
				data: item,
				title: item
			};
		}));
	});
}

function get_json_bar_chart () {
	

}

// Copy the remote CSV locally
function store_csv(app_path, archive, callback) {

    csv = app_path + 'db/' + archive + '.csv';
    remote_csv = 'http://' + conf.server_host + ':' + conf.server_port + '/';
    remote_csv += archive + '-remote.csv';
    file = fs.createWriteStream(csv);
    store = http.get(remote_csv, function (response) {
        response.pipe(file);
        callback(null);
    });
}

/**********************************************************************/
