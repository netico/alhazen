// Default settings

module.exports = {
  'straight-table': {

  },
  'bar-chart': {
    serieField: '',
    trendBy: '',
    legendPosition: 'top',
    colorPalette: 1,
    backgroundAlpha: 0.5,
    borderAlpha: 0.8,
    borderWidth: 2,
    horizontal: false,
    stacked: false,
    sortLabel: false,
    stepSize: 0,
    beginAtZero: true,
  },
  'line-chart': {
    serieField: '',
    trendBy: '',
    legendPosition: 'top',
    colorPalette: 1,
    fill: false,
    showLine: true,
    lineTension: 0.4,
    backgroundAlpha: 0.5,
    borderAlpha: 0.8,
    borderWidth: 3,
    sortLabel: false,
    stepSize: 0,
    beginAtZero: true,
  },
  'pie-chart': {
    serieField: '',
    trendBy: '',
    legendPosition: 'top',
    colorPalette: 1,
    backgroundAlpha: 1,
    borderAlpha: 1,
    borderWidth: 3,
    defaultBorder: true,
    sortLabel: false,
    doughnut: false,
  },
};
