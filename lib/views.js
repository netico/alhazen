const COLORS = [
  '160, 26, 125',
  '236, 64, 103',
  '56, 111, 164',
  '209, 122, 34',
  '206, 66, 87',
  '76, 6, 29',
  '49, 24, 71',
  '34, 146, 164',
  '255, 212, 71',
  '164, 14, 76',
  '93, 78, 109',
  '7, 79, 87',
  '224, 159, 125',
  '233, 196, 106',
  '239, 93, 96',
  '255, 127, 81',
  '219, 80, 74',
  '79, 52, 90',
  '255, 155, 84',
  '188, 231, 132',
];


exports.straighttable = (rawData) => {
  const columns = Object.keys(rawData[0]).map(el => ({
    data: el,
    title: el,
  }));
  const data = rawData;
  return {
    columns,
    data,
  };
};

exports.barchart = (rawData) => {
  const keys = Object.keys(rawData[0]);
  const agg = keys[1];
  const data = rawData.reduce((res, el) => {
    const index = res.labels.indexOf(el[agg]);
    if (index !== -1) {

    } else {

    }
    return res;
  }, { labels: [], datasets: [] });
};

// exports.barchart = (data) => {
//   const json = data.reduce((a, b) => {
//     const c = Object.values(b);
//     a.v.push(c[1].replace(',', '.'));
//     a.k.push(c[2]);
//     return a;
//   }, { v: [], k: [] });

//   return {
//     type: 'bar',
//     data: {
//       labels: json.k,
//       datasets: [{
//         label: 'Example',
//         data: json.v,
//         backgroundColor: 'rgba(54, 162, 235, 0.2)',
//       }],
//     },
//   };
// };

exports.piechart = (data) => {
  const json = data.reduce((a, b) => {
    const c = Object.values(b);
    a.v.push(c[1].replace(',', '.'));
    a.k.push(c[2]);
    return a;
  }, { v: [], k: [] });

  return {
    type: 'pie',
    data: {
      labels: json.k,
      datasets: [{
        label: 'Example',
        data: json.v,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      }],
    },
  };
};

exports.linechart = () => 'Yo line!';

exports.areachart = () => 'Yo area!';

exports.scatterchart = () => 'Yo scatter!';
