module.exports = {
  // HTTP server
  server_port: 3000,
  server_host: 'localhost',
  // Databases
  connectionString: {
    db_name_1: '',
    db_name_2: '',
    // add other databases...
  },
  // Sheets views
  sheets: [
    // **** straight-table ****
    {
      query: '',
      type: 'straight-table',
      name: 'view name',
      db: 'db name',
    },
    // **** bar-chart ****
    {
      query: '',
      type: 'bar-chart',
      name: 'view name',
      db: 'db name',
      settings: {
        serieField: '', // required
        trendBy: '',
        // add other settings from chartDefaultSett.js
      },
    },
    // **** line-chart ****
    {
      query: '',
      type: 'line-chart',
      name: 'view name',
      db: 'db name',
      settings: {
        serieField: '', // required
        trendBy: '',
        // add other settings from chartDefaultSett.js
      },
    },
  ],
};
