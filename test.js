
function json2array(json)
{
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function(key)
    {
        result.push(json[key]);
    });
    return result;
}

var pg_client = require('pg').Client;
var pg_connection = 'postgresql://netico:test@localhost:5432/development';

var client = new pg_client({
    connectionString: pg_connection
});


client.connect();

client.query('SELECT  * from customers LIMIT 10', function (err, res ) {

    rows = res.rows;
    fields = json2array(res.fields);
    c = 0;
    output = '';

    // Intestazioni
    csv_headers = '';

    csv_headers += 'Id;';
    fields.forEach(function (column) {

        csv_headers += String(column.name) + ';';
    });
    output += csv_headers + 'End\r\n';

    
    rows.forEach(function (json_row) {
        c++
        row = json2array(json_row) 

        output += c + ';';
        row.forEach(function (column) {
            if (isNaN(column)) {
                // Stringa
                csv_row = String(column);
                csv_row = csv_row.trim();
                csv_row = csv_row.replace(';', ',');
                csv_row = csv_row + ';';
            } else {
                // Numero
                csv_row = column + 0;
                csv_row = csv_row.toString().replace(
                    '.', ','
                ) + ';';
            }
            output += csv_row;
        });
        output += '\r\n';
    });
    console.log(output);

    client.end();
});


