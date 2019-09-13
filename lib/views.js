const COLORS = require('../config/colors').colors;
const defaultSettings = require('../config/chartDefaultSett');


const mergeSettings = (sheetSettings, type) => {
  const settings = JSON.parse(JSON.stringify(defaultSettings[type]));
  const keys = Object.keys(settings);
  keys.forEach((e) => {
    settings[e] = sheetSettings[e] !== undefined ? sheetSettings[e] : settings[e];
  });
  return settings;
};


const generateChartData = (data, settings) => {
  const fields = Object.keys(data[0]);

  if (!settings.serieField || !fields.includes(settings.serieField)) {
    return { error: 'Serie Error', data: null };
  }

  fields.splice(fields.indexOf('#'), 1);
  fields.splice(fields.indexOf(settings.serieField), 1);

  const datasets = [];
  const series = Array.from(new Set(data.map(e => e[settings.serieField])));
  let labels = fields;

  if (settings.trendBy && fields.includes(settings.trendBy)) {
    labels = Array.from(new Set(data.map(e => e[settings.trendBy])));
    fields.splice(fields.indexOf(settings.trendBy), 1);
    if (fields.length > 1) {
      return { error: 'Trend Error', data: null };
    }
  }

  if (settings.sortLabel === true) labels.sort();

  const colorPalette = (settings.colorPalette - 1) % COLORS.length;

  data.forEach((e) => {
    const i = series.indexOf(e[settings.serieField]);
    if (datasets[i] === undefined) {
      datasets[i] = {
        label: e[settings.serieField],
        backgroundColor: `rgba(${COLORS[colorPalette][i % COLORS[colorPalette].length]}, ${settings.backgroundAlpha} )`,
        borderColor: `rgba(${COLORS[colorPalette][i % COLORS[colorPalette].length]}, ${settings.borderAlpha})`,
        data: [],
      };
    }
    fields.forEach((f) => {
      const lb = settings.trendBy ? e[settings.trendBy] : f;
      const lbIndex = labels.indexOf(lb);
      datasets[i].data[lbIndex] = e[f].replace(',', '.');
    });
  });

  return { error: null, data: { labels, datasets } };
};


exports.straighttable = (rawData) => {
  const columns = Object.keys(rawData[0]).map(el => ({
    data: el,
    title: el,
  }));
  const data = rawData;
  return { error: null, result: { columns, data } };
};

exports.barchart = (rawData, sheet) => {
  const settings = mergeSettings(sheet.settings, sheet.type);
  const { error, data } = generateChartData(rawData, settings);

  if (error) {
    return { error, result: null };
  }

  data.datasets.forEach((e) => {
    e.borderWidth = settings.borderWidth;
  });

  const chart = {
    type: settings.horizontal ? 'horizontalBar' : 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets,
    },
    options: {
      title: {
        display: true,
        text: sheet.name.toUpperCase(),
        fontSize: 28,
      },
      legend: {
        position: settings.legendPosition,
      },
      scales: {
        xAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: settings.stepSize,
          },
          stacked: false,
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: settings.stepSize,
          },
          stacked: false,
        }],
      },
    },
  };

  if (settings.stacked) {
    chart.options.scales.xAxes[0].stacked = true;
    chart.options.scales.yAxes[0].stacked = true;
  }

  return { error: null, result: chart };
};

exports.piechart = () => 'Yo pie!';

exports.linechart = (rawData, sheet) => {
  const settings = mergeSettings(sheet.settings, sheet.type);
  const { error, data } = generateChartData(rawData, settings);

  if (error) {
    return { error, result: null };
  }

  data.datasets.forEach((e) => {
    e.borderWidth = settings.borderWidth;
    e.fill = settings.fill;
    e.showLine = settings.showLine;
    e.lineTension = settings.lineTension;
  });

  const chart = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets,
    },
    options: {
      title: {
        display: true,
        text: sheet.name.toUpperCase(),
        fontSize: 28,
      },
      legend: {
        position: settings.legendPosition,
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: settings.stepSize,
          },
        }],
      },
    },
  };

  return { error: null, result: chart };
};

exports.areachart = () => 'Yo area!';

exports.scatterchart = () => 'Yo scatter!';