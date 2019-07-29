document.getElementById('side-head').classList.add(`bg-${type}`);

document.getElementById('side-title').innerHTML = type.split('-').reduce((tot, el) => {
  const str = el[0].toUpperCase() + el.slice(1, el.length);
  return tot += `${str} `;
}, '').trim();

// -- moved to nav --
// document.getElementById('li-' + type).classList.add('d-block', 'd-lg-none');

jQuery.get(`/get/conf/sheets/${type}`, (data) => {
  const list = document.getElementById('side-list');
  data.forEach((el, i) => {
    console.log(i, el.name);
    list.insertAdjacentHTML(
      'beforeend',
      `<a href="/view/${el.type}/${el.name}" class="list-group-item list-group-item-action smaller-text bg-light">${
        el.name}<span class="badge badge-pill badge-secondary float-right">${el.db}</span>`
      + '</a>',
    );
    if (el.name === sheet) {
      const elem = list.children[i];
      elem.classList.remove('bg-light');
      elem.classList.add('active');
      elem.children[0].classList.remove('badge-secondary');
      elem.children[0].classList.add('badge-dark');
    }
  });
});
