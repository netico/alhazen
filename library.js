module.exports.json2array = function(json) {
  var result = [];
  var keys = Object.keys(json);
  keys.forEach(function(key) {
    result.push(json[key]);
  });
  return result;
};
// Perform a query on the remote database and format the results in
// CSV format
// Requires a PostgreSQL backend
module.exports.get_csv = function(config, query, callback) {
  let client = new pg_client({
    connectionString: config
  });
  client.connect();
  let this_object = this;
  client.query(query, function(err, res) {
    if (err) {
      return console.log(err);
    } else {
      rows = res.rows;
      fields = this_object.json2array(res.fields);
      c = 0;
      output = '';
      // Headers
      csv_headers = [];
      csv_headers.push('#');
      fields.forEach(function(column) {
        csv_headers.push(String(column.name));
      });
      output += csv_headers.join(';') + '\r\n';
      rows.forEach(function(json_row) {
        c++;
        row = this_object.json2array(json_row);
        output += c + ';';
        row = row.map(function(column) {
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
        output += row.join(';');
        output += '\r\n';
      });
      callback(output);
      client.end();
    }
  });
};
module.exports.get_local_json_straight_table_data = function(csv_file, callback) {
  var converter = new csvtojson_converter({
    delimiter: ';'
  });
  converter.fromFile(csv_file).then(function(result) {
    var json = result;
    callback(json);
  }).catch(function(err) {
    if (err) {
      console.log("An error has occured");
      console.log(err);
    }
  });
};
module.exports.get_local_json_straight_table_headers = function(csv_file, callback) {
  fs.readFile(csv_file, 'utf8', function(err, data) {
    if (err) {
      return console.log(err);
    }
    lines = data.split(/\r\n|\r|\n/);
    // creates columns by splitting first line of csv
    columns = lines[0].split(';');
    callback(columns.map(function(item) {
      return {
        data: item,
        title: item
      };
    }));
  });
};
module.exports.get_local_json_bar_chart_data = function(csv_file, callback) {
  var converter = new csvtojson_converter({
    delimiter: ';'
  });
  converter.fromFile(csv_file).then(function(result) {
    var json = result.reduce(function(a, b) {
      b = Object.values(b);
      a.v.push(b[1].replace(',', '.'));
      a.k.push(b[2]);
      return a;
    }, { v: [], k: [] });
    callback(json);
  }).catch(function(err) {
    if (err) {
      console.log("An error has occured");
      console.log(err);
    }
  });
};
// Copy the remote CSV locally
module.exports.store_csv = function(app_path, sheet, type, callback) {
  csv = app_path + 'db/' + sheet + '-' + type + '.csv';
  remote_csv = 'http://' + conf.server_host + ':' + conf.server_port + '/';
  remote_csv += 'get/remote/csv/' + type + '/' + sheet;
  file = fs.createWriteStream(csv);
  store = http.get(remote_csv, function(response) {
    response.pipe(file);
    callback(null);
  });
};

//************   OLD   ********************************
module.exports.get_sheets_and_types = function(filter) {
  var result = [];
  var keys = Object.keys(conf.sheets);
  keys.forEach(function(key) {
    result.push(sheets[key]);
  });
  s = lodash.uniqBy(result, filter);
  var array = s.reduce(function(a, b) {
    b = Object.values(b);
    a.type.push(b[1]);
    a.name.push(b[2]);
    return a;
  }, { type: [], name: [] });
  return array;
};
