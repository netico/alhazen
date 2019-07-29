const CsvToJsonConverter = require('csvtojson').Converter;

const dir = `${__dirname}/..`;

module.exports.get_local_json_straight_table_data = (sheet, type, callback) => {
  const csvFile = `${dir}/db/${sheet}-${type}.csv`;
  const converter = new CsvToJsonConverter({
    delimiter: ';',
  });
  converter.fromFile(csvFile).then((result) => {
    const json = result;
    const header = Object.keys(json[0]).map(el => ({
      data: el,
      title: el,
    }));
    callback({
      columns: header,
      data: json,
    });
  }).catch((err) => {
    if (err) {
      // Reload data if .csv doesn't exist
    }
  });
};

module.exports.get_local_json_bar_chart_data = (sheet, type, callback) => {
  const csvFile = `${dir}/db/${sheet}-${type}.csv`;
  const converter = new CsvToJsonConverter({
    delimiter: ';',
  });
  converter.fromFile(csvFile).then((result) => {
    const json = result.reduce((a, b) => {
      console.log(b);
      const c = Object.values(b);
      console.log(c);
      a.v.push(c[1].replace(',', '.'));
      a.k.push(c[2]);
      console.log(a);
      return a;
    }, { v: [], k: [] });
    callback(json);
  }).catch((err) => {
    if (err) {
      // Reload data if .csv doesn't exist
    }
  });
};

module.exports.get_local_json_pie_chart_data = (sheet, type, callback) => {
  const csvFile = `${dir}/db/${sheet}-${type}.csv`;
  const converter = new CsvToJsonConverter({
    delimiter: ';',
  });
  converter.fromFile(csvFile).then((result) => {
    const json = result.reduce((a, b) => {
      const c = Object.values(b);
      a.v.push(c[1].replace(',', '.'));
      a.k.push(c[2]);
      return a;
    }, { v: [], k: [] });
    callback(json);
  }).catch((err) => {
    if (err) {
      // Reload data if .csv doesn't exist
    }
  });
};
