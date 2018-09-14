
library = require ('./library');
conf = require ('./configuration');
sheets = conf.sheets;

/**********************************************************************/

// node.js
express = require ('express');
pg_client = require ('pg').Client;
ejs = require ('ejs');
csvtojson_converter = require ('csvtojson').Converter;
lodash = require ('lodash');
fs = require ('fs');
http = require ('http');
path = require ('path');

/**********************************************************************/

// App Express
app = express ();
app_path = path.join (__dirname) + '/';
app.use ('/views', express.static (app_path + 'views'));
server = app.listen (process.env.PORT || conf.server_port, function () 
{
    port = server.address().port;
    console.log('Server started on port', port);
});

/**********************************************************************/

// Routing
app.get('/view/:type/:sheet', function (req, res) 
{
    sheet = req.params.sheet;
    type = req.params.type;
    item = lodash.find (sheets, {'name': sheet, 'type': type});
    db_csv = app_path + 'db/' + sheet + '-' + type + '.csv';

    // HTML template
    res.render ('template/types/' + type + '.ejs');
    
    app.get ('/get/remote/csv/' + type + '/' + sheet, function (req, res) 
    {
        library.get_csv (conf.connection_string, item.query, function (CSV) 
        {		
            res.header ('Content-type: text/csv');
            res.send (new Buffer(CSV));
        });
    });
    
    app.get ('/get/local/csv/' + type + '/' + sheet, function (req, res) 
    {
        res.header ('Content-type: text/csv');
        res.sendFile (db_csv);
    });
    
    app.get ('/get/local/json/straight-table/data/' + sheet, function (req, res) 
    {
        library.get_local_json_straight_table_data (db_csv, function (JSON) 
        {	
            res.header ('Content-type: text/json');
            res.json ({data: JSON});
        });     
    });
    
    app.get ('/get/local/json/straight-table/headers/' + sheet, function (req, res) 
    {
        library.get_local_json_straight_table_headers (db_csv, function (JSON) 
        {
            res.header ('Content-type: text/json');
            res.json (JSON); 
        });
    });
    
    app.get ('/get/local/json/bar-chart/data/' + sheet, function (req, res) 
    {
        library.get_local_json_bar_chart_data(db_csv, function (JSON) 
        {	
            res.header ('Content-type: text/json'); 
            res.json (JSON);
        });
    });
});

// Home
app.get('/', function (req, res) 
{
    res.redirect ('/view/straight-table/orders');
});

app.get('/get/conf/:item', function (req, res) 
{
	item = req.params.item;
	var a = library.get_sheets_and_types(item);
	res.header ('Content-type: text/json');
    res.json ({conf: a[item]});
});


// Reload sheets remotely and copy them locally
app.get ('/reload/:type/:sheet', function (req, res) 
{
	sheet = req.params.sheet;
	type = req.params.type;
	library.store_csv (app_path, sheet, type, function () 
	{
		res.redirect ('/view/' + type + '/' + sheet);
	});
	
});
