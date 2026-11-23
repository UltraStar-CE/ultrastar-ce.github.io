'use strict';

const { screens } = window.USCE_THEME_GALLERY;
const screenshots = window.USCE_THEME_GALLERY.screenshots.filter(row => row.language === 'English');
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
const defaults = { screen: 'main', theme: '', resolution: '1280x720' };
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
  url.searchParams.delete('language');
  url.searchParams.delete('view');
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

function picture(row) {
  const frame = row.latest;
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
  return figure;
}

function card(row) {
  const article = element('article', '', 'theme-card');
  article.append(
    picture(row),
    element('h2', themeName(row.theme)),
    element('p', screens[row.screen] + ' · ' + row.latest.skin),
    element('p', resolutionName(row.resolution)),
  );
  return article;
}

function display() {
  const matches = screenshots.filter(row => Object.entries(controls).every(([key, control]) => {
    return !control.value || row[key] === control.value;
  }));
  const last = Math.max(1, Math.ceil(matches.length / pageSize));
  page = Math.min(page, last);
  const start = (page - 1) * pageSize;
  gallery.replaceChildren(...matches.slice(start, start + pageSize).map(card));
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
