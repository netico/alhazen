

// Configuring the HTTP server
server_port = 3000;
server_host = 'localhost';
// Database
config = 'postgresql://netico:test@localhost:5432/development';

/**********************************************************************/

// node.js
express = require('express');
pg_client = require('pg').Client;
ejs = require('ejs');


/**********************************************************************/

// App Express
app = express();
path = require('path');
app_path = path.join(__dirname) + '/';
app.use('/views', express.static(app_path + 'views'));
// HTTP Server
server = app.listen(process.env.PORT || server_port, function () {
    port = server.address().port;
    console.log('Il server è partito sulla porta', port);
});
/**********************************************************************/

// Routing
app.get('/view', function (req, res) {

    parameter_module = req.query.module;
    query = '';
    switch (parameter_module) {

        case 'customers':
            // customers
            query += 'SELECT * FROM customers LIMIT 100'
            module(res, parameter_module, query, app, app_path);
            break;
        default:
            // HTML
            res.render('template/modules/home.ejs');
    }
});
// Home
app.get('/', function (req, res) {

    res.redirect('/view/?module=home');
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

        get_csv(config, query, function (CSV) {
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
            res.send(JSON);
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

        rows = res.rows;
        fields = json2array(res.fields);
        c = 0;
        output = '';

        // Headers
        csv_headers = '';

        csv_headers += 'Id;';
        fields.forEach(function (column) {

            csv_headers += String(column.name) + ';';
        });
        output += csv_headers + '\r\n';


        rows.forEach(function (json_row) {
            c++
            row = json2array(json_row)

            output += c + ';';
            row.forEach(function (column) {
                if (isNaN(column)) {
                    // String or something else
                    csv_row = String(column);
                    csv_row = csv_row.trim();
                    csv_row = csv_row.replace(';', ',');
                    csv_row = csv_row + ';';
                } else {
                    // Number
                    csv_row = column + 0;
                    csv_row = csv_row.toString().replace(
                        '.', ','
                    ) + ';';
                }
                output += csv_row;
            });
            output += '\r\n';
        });
        callback(output);

        client.end();
    });

};

function get_json (csv_file, callback) {
	
	var Converter = require("csvtojson").Converter;
	var converter = new Converter({
		delimiter: ';'
	});
	
	// call the fromFile function which takes in the path to your 
	// csv file as well as a callback function
	console.log(csv_file);

	converter.fromFile(csv_file).then ( function (result) 
	{
		
		console.log(csv_file);
		// if an error has occured then handle it
		/*if(err){
			console.log("An Error Has Occured");
			console.log(err);  
		} */
		// create a variable called json and store
		// the result of the conversion
		var json = result;
		
		// log our json to verify it has worked
		//console.log(json);
		callback(json);
	})
	.catch ( function (err) {
		if(err){
			console.log("An Error Has Occured");
			console.log(err);  
		}
	});
}

// Copy the remote CSV locally
function store_csv(app_path, archive, callback) {


    http = require('http');
    fs = require('fs');
    csv = app_path + 'db/' + archive + '.csv';
    remote_csv = 'http://' + server_host + ':' + server_port + '/';
    remote_csv += archive + '-remote.csv';
    file = fs.createWriteStream(csv);
    store = http.get(remote_csv, function (response) {
        response.pipe(file);
        callback(null);
    });
}

/**********************************************************************/
