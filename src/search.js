export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function initSearch(inputEl, onSearch) {
  const handler = debounce((e) => onSearch(e.target.value), 250);
  inputEl.addEventListener('input', handler);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputEl.value = '';
      onSearch('');
    }
  });
}
