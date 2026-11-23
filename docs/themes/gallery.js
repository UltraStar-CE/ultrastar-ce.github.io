'use strict';

const { screens, screenshots } = window.USCE_THEME_GALLERY;
const filters = document.querySelector('#theme-filters');
const gallery = document.querySelector('#theme-gallery');
const results = document.querySelector('#theme-results');
const navigation = document.querySelector('#theme-pagination');
const pageText = document.querySelector('#theme-page');
const previous = document.querySelector('#previous-page');
const next = document.querySelector('#next-page');
const controls = Object.fromEntries(
  [...filters.querySelectorAll('select')].map(control => [control.name, control]),
);
const defaults = { screen: 'main', theme: '', language: 'English', resolution: '1280x720', view: 'latest' };
const shortThemeNames = { WorldPartyArgon: 'WorldParty Argon', WorldPartyNeon: 'WorldParty Neon' };
const pageSize = 24;
let page = 1;

function resolutionName(value) {
  return value.replace('x', ' × ');
}

function themeName(theme) {
  return shortThemeNames[theme] || theme;
}

function appendOptions(key, values, display = value => value) {
  for (const value of values) {
    controls[key].append(new Option(display(value), value));
  }
}

function distinct(key) {
  return [...new Set(screenshots.map(row => row[key]))].sort((a, b) => a.localeCompare(b));
}

appendOptions('screen', Object.keys(screens), screen => screens[screen]);
appendOptions('theme', distinct('theme'), themeName);
appendOptions('language', distinct('language'));
appendOptions('resolution', distinct('resolution'), resolutionName);

function setFilters(searchParams) {
  for (const [name, control] of Object.entries(controls)) {
    const value = searchParams.get(name) ?? defaults[name];
    control.value = [...control.options].some(option => option.value === value) ? value : defaults[name];
  }
  page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
}

function setAddress() {
  const url = new URL(location.href);
  for (const [name, control] of Object.entries(controls)) {
    if (control.value === defaults[name]) url.searchParams.delete(name);
    else url.searchParams.set(name, control.value);
  }
  if (page === 1) url.searchParams.delete('page');
  else url.searchParams.set('page', page);
  history.replaceState(null, '', url);
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function picture(row, version, caption) {
  const frame = row[version];
  const descriptor = themeName(row.theme) + ' · ' + screens[row.screen];
  const figure = element('figure');
  const link = element('a');
  link.href = frame.src;
  link.setAttribute('aria-label', 'Open full-size screenshot: ' + descriptor);
  const image = element('img');
  image.src = frame.src;
  image.alt = descriptor;
  image.width = frame.width;
  image.height = frame.height;
  image.loading = 'lazy';
  image.decoding = 'async';
  link.append(image);
  figure.append(link);
  if (caption) figure.append(element('figcaption', caption));
  return figure;
}

function card(row, mode) {
  const article = element('article', '', 'theme-card');
  if (mode === 'compare') {
    const pair = element('div', '', 'theme-images');
    pair.append(picture(row, 'earlier', 'Before'), picture(row, 'latest', 'After'));
    article.append(pair);
  } else {
    article.append(picture(row, mode));
  }
  const chosen = mode === 'earlier' ? row.earlier : row.latest;
  const skin = mode === 'compare' && row.earlier.skin !== row.latest.skin
    ? row.earlier.skin + ' → ' + row.latest.skin
    : chosen.skin;
  article.append(
    element('h2', themeName(row.theme)),
    element('p', screens[row.screen] + ' · ' + skin),
    element('p', row.language + ' · ' + resolutionName(row.resolution)),
  );
  return article;
}

function display() {
  const mode = controls.view.value;
  const matches = screenshots.filter(row => {
    const matchesFields = ['screen', 'theme', 'language', 'resolution'].every(key => {
      const selected = controls[key].value;
      return !selected || row[key] === selected;
    });
    return matchesFields && (mode === 'latest' || row.earlier);
  });
  const last = Math.max(1, Math.ceil(matches.length / pageSize));
  page = Math.min(page, last);
  const start = (page - 1) * pageSize;
  gallery.classList.toggle('is-comparing', mode === 'compare');
  gallery.replaceChildren(...matches.slice(start, start + pageSize).map(row => card(row, mode)));
  results.textContent = matches.length
    ? matches.length + (matches.length === 1 ? ' result' : ' results')
    : 'No screenshots match these filters.';
  navigation.hidden = last === 1;
  previous.disabled = page === 1;
  next.disabled = page === last;
  pageText.textContent = page + ' / ' + last;
  setAddress();
}

filters.addEventListener('submit', event => event.preventDefault());
filters.addEventListener('change', () => {
  page = 1;
  display();
});
filters.addEventListener('reset', event => {
  event.preventDefault();
  setFilters(new URLSearchParams());
  display();
});
for (const [button, offset] of [[previous, -1], [next, 1]]) {
  button.addEventListener('click', () => {
    page += offset;
    display();
    results.scrollIntoView({ block: 'start' });
  });
}
window.addEventListener('popstate', () => {
  setFilters(new URLSearchParams(location.search));
  display();
});

setFilters(new URLSearchParams(location.search));
display();
