function reload_data() {
  location.href = `/reload/${type}/${sheet}`;
}

function download_data() {
  location.href = `/get/local/csv/${type}/${sheet}`;
}

document.querySelectorAll('.reload').forEach((el) => {
  el.addEventListener('click', reload_data);
});

document.querySelectorAll('.down-csv').forEach((el) => {
  el.addEventListener('click', download_data);
});
