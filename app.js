// ===== CONFIG =====
const API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; // OpenWeatherMap public sample API key
const BASE = 'https://api.openweathermap.org/data/2.5';
const GEO = 'https://api.openweathermap.org/geo/1.0';

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const cityInput = $('#city-input');
const searchBtn = $('#search-btn');
const locationBtn = $('#location-btn');
const loading = $('#loading');
const error = $('#error');
const errorMsg = $('#error-msg');
const mainContent = $('#main-content');

// ===== DEMO / API MODE =====
function isApiConfigured() {
  return API_KEY && API_KEY.length > 10;
}

// ===== DEMO DATA =====
function getDemoData() {
  const now = Date.now() / 1000;
  return {
    current: {
      city: 'Jabalpur',
      country: 'IN',
      temp: 32,
      feels_like: 35,
      temp_min: 28,
      temp_max: 36,
      humidity: 45,
      pressure: 1012,
      visibility: 8,
      wind_speed: 14,
      description: 'Partly Cloudy',
      icon: '02d',
      sunrise: now - 21600,
      sunset: now + 21600,
      uv: 6.2,
    },
    hourly: Array.from({ length: 24 }, (_, i) => ({
      dt: now + i * 3600,
      temp: Math.round(28 + 8 * Math.sin((i - 6) * Math.PI / 12)),
      icon: i >= 6 && i <= 18 ? (i % 3 === 0 ? '02d' : '01d') : '01n',
    })),
    daily: [
      { dt: now, temp_min: 28, temp_max: 36, icon: '02d', description: 'Partly Cloudy' },
      { dt: now + 86400, temp_min: 27, temp_max: 35, icon: '01d', description: 'Clear Sky' },
      { dt: now + 172800, temp_min: 26, temp_max: 33, icon: '10d', description: 'Light Rain' },
      { dt: now + 259200, temp_min: 25, temp_max: 31, icon: '09d', description: 'Showers' },
      { dt: now + 345600, temp_min: 27, temp_max: 34, icon: '01d', description: 'Clear Sky' },
    ],
    aqi: {
      aqi: 2,
      components: { pm2_5: 18.4, pm10: 32.1, o3: 68.5, no2: 22.3, so2: 5.1, co: 340 },
    },
  };
}

const autocompleteList = $('#autocomplete-list');
let acTimeout = null;
let acIndex = -1;

// ===== AUTOCOMPLETE =====
cityInput.addEventListener('input', () => {
  clearTimeout(acTimeout);
  const q = cityInput.value.trim();
  if (q.length < 1) { hideAutocomplete(); return; }
  acTimeout = setTimeout(() => fetchSuggestions(q), 300);
});

cityInput.addEventListener('keydown', (e) => {
  const items = autocompleteList.querySelectorAll('li');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acIndex = Math.min(acIndex + 1, items.length - 1);
    updateActiveItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acIndex = Math.max(acIndex - 1, 0);
    updateActiveItem(items);
  } else if (e.key === 'Enter') {
    if (acIndex >= 0 && items[acIndex]) {
      items[acIndex].click();
    } else {
      hideAutocomplete();
      handleSearch();
    }
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) hideAutocomplete();
});

async function fetchSuggestions(q) {
  if (!isApiConfigured()) { hideAutocomplete(); return; }
  try {
    const res = await fetch(`${GEO}/direct?q=${encodeURIComponent(q)}&limit=5&appid=${API_KEY}`);
    const data = await res.json();
    if (!data.length) { hideAutocomplete(); return; }
    autocompleteList.innerHTML = data
      .map((c, i) => `<li data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}" data-country="${c.country || ''}">${c.name}${c.state ? ', ' + c.state : ''}<span class="country">${c.country || ''}</span></li>`)
      .join('');
    acIndex = -1;
    autocompleteList.classList.remove('hidden');
    autocompleteList.querySelectorAll('li').forEach((li) => {
      li.addEventListener('click', () => {
        const { lat, lon, name, country } = li.dataset;
        cityInput.value = name;
        hideAutocomplete();
        showLoading();
        fetchAndRender(parseFloat(lat), parseFloat(lon), name, country);
      });
    });
  } catch { hideAutocomplete(); }
}

function hideAutocomplete() {
  clearTimeout(acTimeout);
  autocompleteList.classList.add('hidden');
  autocompleteList.innerHTML = '';
  acIndex = -1;
}

function updateActiveItem(items) {
  items.forEach((li, i) => li.classList.toggle('active', i === acIndex));
}

// ===== EVENT LISTENERS =====
searchBtn.addEventListener('click', () => { hideAutocomplete(); handleSearch(); });
locationBtn.addEventListener('click', handleGeoLocation);

// ===== HANDLERS =====
let lastSearchQuery = '';

async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city || city === lastSearchQuery) return;
  lastSearchQuery = city;

  if (!isApiConfigured()) {
    renderDemo(city);
    return;
  }

  hideAutocomplete();
  showLoading();
  try {
    const geoRes = await fetch(`${GEO}/direct?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`);
    const geoData = await geoRes.json();
    if (!geoData.length) {
      showError('City not found. Please try another name.');
      return;
    }
    // Exact-ish match: first result name starts similarly
    const best = geoData[0];
    if (best.name.toLowerCase() === city.toLowerCase()) {
      await fetchAndRender(best.lat, best.lon, best.name, best.country);
    } else {
      // Show "did you mean" with all close matches
      showDidYouMean(city, geoData);
    }
  } catch (err) {
    showError(err.message);
  }
}

function handleGeoLocation() {
  if (!navigator.geolocation) {
    if (!isApiConfigured()) { renderDemo('Your Location'); return; }
    showError('Geolocation is not supported by your browser.');
    return;
  }

  if (!isApiConfigured()) { renderDemo('Your Location'); return; }

  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const geoRes = await fetch(`${GEO}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
        const geoData = await geoRes.json();
        const name = geoData[0]?.name || 'Your Location';
        const country = geoData[0]?.country || '';
        await fetchAndRender(lat, lon, name, country);
      } catch (err) {
        showError(err.message);
      }
    },
    () => showError('Location access denied.')
  );
}

// ===== DEMO RENDER =====
function renderDemo(cityName) {
  const demo = getDemoData();
  demo.current.city = cityName || 'Jabalpur';
  showLoading();
  // Simulate loading delay
  setTimeout(() => {
    loading.classList.add('hidden');
    error.classList.add('hidden');
    mainContent.classList.remove('hidden');
    renderCurrent(demo.current);
    renderHourly(demo.hourly);
    renderDaily(demo.daily);
    renderSun(demo.current.sunrise, demo.current.sunset);
    renderAQI(demo.aqi);
  }, 600);
}

// ===== FETCH & RENDER =====
async function fetchAndRender(lat, lon, name, country) {
  try {
    const [weatherRes, forecastRes, aqiRes] = await Promise.all([
      fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`${BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
    ]);

    if (!weatherRes.ok) throw new Error('Failed to fetch weather data.');

    const weather = await weatherRes.json();
    const forecast = await forecastRes.json();
    const aqi = await aqiRes.json();

    const current = {
      city: name,
      country,
      temp: Math.round(weather.main.temp),
      feels_like: Math.round(weather.main.feels_like),
      temp_min: Math.round(weather.main.temp_min),
      temp_max: Math.round(weather.main.temp_max),
      humidity: weather.main.humidity,
      pressure: weather.main.pressure,
      visibility: (weather.visibility / 1000).toFixed(1),
      wind_speed: Math.round(weather.wind.speed * 3.6),
      description: weather.weather[0].description,
      icon: weather.weather[0].icon,
      sunrise: weather.sys.sunrise,
      sunset: weather.sys.sunset,
      uv: '--',
    };

    // Build hourly from 3-hour forecast (up to 24h = 8 entries)
    const hourly = forecast.list.slice(0, 8).map((h) => ({
      dt: h.dt,
      temp: Math.round(h.main.temp),
      icon: h.weather[0].icon,
    }));

    // Build daily by grouping forecast by day
    const dayMap = {};
    forecast.list.forEach((item) => {
      const day = new Date(item.dt * 1000).toDateString();
      if (!dayMap[day]) {
        dayMap[day] = { dt: item.dt, temps: [], icon: item.weather[0].icon, description: item.weather[0].description };
      }
      dayMap[day].temps.push(item.main.temp_min, item.main.temp_max);
      // Use the midday icon if available
      const hour = new Date(item.dt * 1000).getHours();
      if (hour >= 11 && hour <= 14) {
        dayMap[day].icon = item.weather[0].icon;
        dayMap[day].description = item.weather[0].description;
      }
    });

    const daily = Object.values(dayMap).slice(0, 5).map((d) => ({
      dt: d.dt,
      temp_min: Math.round(Math.min(...d.temps)),
      temp_max: Math.round(Math.max(...d.temps)),
      icon: d.icon,
      description: d.description,
    }));

    const aqiData = {
      aqi: aqi.list?.[0]?.main?.aqi || 1,
      components: aqi.list?.[0]?.components || {},
    };

    loading.classList.add('hidden');
    error.classList.add('hidden');
    mainContent.classList.remove('hidden');

    renderCurrent(current);
    renderHourly(hourly);
    renderDaily(daily);
    renderSun(current.sunrise, current.sunset);
    renderAQI(aqiData);
  } catch (err) {
    showError(err.message);
  }
}

// ===== RENDERERS =====
function renderCurrent(data) {
  $('#city-name').textContent = `${data.city}, ${data.country}`;
  $('#date-time').textContent = formatDateTime(new Date());
  $('#hero-icon').src = `https://openweathermap.org/img/wn/${data.icon}@4x.png`;
  $('#hero-icon').alt = data.description;
  $('#hero-temp').textContent = data.temp;
  $('#hero-desc').textContent = data.description;
  $('#temp-max').textContent = data.temp_max;
  $('#temp-min').textContent = data.temp_min;
  $('#humidity').textContent = `${data.humidity}%`;
  $('#wind').textContent = `${data.wind_speed} km/h`;
  $('#visibility').textContent = `${data.visibility} km`;
  $('#pressure').textContent = `${data.pressure} hPa`;
  $('#feels-like').innerHTML = `${data.feels_like}&deg;`;
  $('#uv-index').textContent = data.uv;
}

function renderHourly(hours) {
  const container = $('#hourly-container');
  container.innerHTML = hours
    .map(
      (h, i) => `
    <div class="hour-item ${i === 0 ? 'now' : ''}">
      <span class="time">${i === 0 ? 'Now' : formatHour(h.dt)}</span>
      <img src="https://openweathermap.org/img/wn/${h.icon}@2x.png" alt="weather" />
      <span class="temp">${h.temp}&deg;</span>
    </div>`
    )
    .join('');
}

function renderDaily(days) {
  const allMin = Math.min(...days.map((d) => d.temp_min));
  const allMax = Math.max(...days.map((d) => d.temp_max));
  const range = allMax - allMin || 1;

  const container = $('#daily-container');
  container.innerHTML = days
    .map((d, i) => {
      const left = ((d.temp_min - allMin) / range) * 100;
      const width = ((d.temp_max - d.temp_min) / range) * 100;
      const dayName = i === 0 ? 'Today' : formatDay(d.dt);
      const dateStr = formatShortDate(d.dt);

      return `
      <div class="day-item">
        <span class="day-name">${dayName}<small>${dateStr}</small></span>
        <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="${d.description}" />
        <span class="day-desc">${d.description}</span>
        <div class="temp-bar-container">
          <span class="lo">${d.temp_min}&deg;</span>
          <div class="temp-bar">
            <div class="temp-bar-fill" style="left:${left}%;width:${width}%"></div>
          </div>
          <span class="hi">${d.temp_max}&deg;</span>
        </div>
      </div>`;
    })
    .join('');
}

function renderSun(sunrise, sunset) {
  const rise = new Date(sunrise * 1000);
  const set = new Date(sunset * 1000);
  const now = new Date();

  $('#sunrise').textContent = formatTime(rise);
  $('#sunset').textContent = formatTime(set);

  // Position sun dot on arc
  const totalDaylight = set - rise;
  const elapsed = now - rise;
  let progress = Math.max(0, Math.min(1, elapsed / totalDaylight));

  const angle = Math.PI * (1 - progress); // PI to 0 (left to right)
  const arcRadius = 100;
  const cx = arcRadius - arcRadius * Math.cos(angle);
  const cy = -arcRadius * Math.sin(angle) + 100;

  const sunDot = $('#sun-position');
  sunDot.style.left = `${cx - 9}px`;
  sunDot.style.top = `${cy - 9}px`;

  if (progress <= 0 || progress >= 1) {
    sunDot.style.opacity = '0.3';
  } else {
    sunDot.style.opacity = '1';
  }
}

function renderAQI(data) {
  const aqiLevels = [
    { label: 'Good', cls: 'aqi-good' },
    { label: 'Fair', cls: 'aqi-fair' },
    { label: 'Moderate', cls: 'aqi-moderate' },
    { label: 'Poor', cls: 'aqi-poor' },
    { label: 'Very Poor', cls: 'aqi-very-poor' },
  ];

  const level = aqiLevels[data.aqi - 1] || aqiLevels[0];
  const circle = $('#aqi-circle');
  circle.className = `aqi-circle ${level.cls}`;
  $('#aqi-value').textContent = data.aqi;
  const label = $('#aqi-label');
  label.textContent = level.label;
  label.className = `aqi-label ${level.cls}`;

  const comps = [
    { key: 'pm2_5', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'o3', label: 'O₃' },
    { key: 'no2', label: 'NO₂' },
    { key: 'so2', label: 'SO₂' },
    { key: 'co', label: 'CO' },
  ];

  $('#aqi-components').innerHTML = comps
    .map(
      (c) => `
    <div class="aqi-comp-item">
      <span class="comp-label">${c.label}</span>
      <span class="comp-value">${data.components[c.key]?.toFixed(1) ?? '--'}</span>
    </div>`
    )
    .join('');
}

// ===== HELPERS =====
function showLoading() {
  loading.classList.remove('hidden');
  error.classList.add('hidden');
  mainContent.classList.add('hidden');
}

const POPULAR_CITIES = [
  { name: 'Delhi', country: 'IN', lat: 28.6139, lon: 77.209 },
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
];

async function showPopularSuggestions() {
  const grid = $('#suggestions-grid');
  // Show skeleton cards immediately
  grid.innerHTML = POPULAR_CITIES.map((c) =>
    `<div class="suggestion-card skeleton" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}" data-country="${c.country}">
      <div class="sc-left">
        <img src="https://openweathermap.org/img/wn/02d@2x.png" alt="weather" />
        <div class="sc-temp">--°</div>
      </div>
      <div class="sc-right">
        <div class="sc-city">${c.name}</div>
        <div class="sc-country">${c.country}</div>
        <div class="sc-desc">Loading...</div>
      </div>
      <div class="sc-details">
        <span><i class="fas fa-droplet"></i> --%</span>
        <span><i class="fas fa-wind"></i> -- km/h</span>
      </div>
    </div>`
  ).join('');
  attachSuggestionListeners();

  if (!isApiConfigured()) return;

  try {
    const results = await Promise.all(
      POPULAR_CITIES.map(async (c) => {
        const res = await fetch(`${BASE}/weather?lat=${c.lat}&lon=${c.lon}&units=metric&appid=${API_KEY}`);
        const data = await res.json();
        return {
          ...c,
          temp: Math.round(data.main.temp),
          feels: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          wind: Math.round(data.wind.speed * 3.6),
          icon: data.weather[0].icon,
          desc: data.weather[0].description,
        };
      })
    );
    grid.innerHTML = results.map((c) =>
      `<div class="suggestion-card" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}" data-country="${c.country}">
        <div class="sc-left">
          <img src="https://openweathermap.org/img/wn/${c.icon}@2x.png" alt="${c.desc}" />
          <div class="sc-temp">${c.temp}°</div>
        </div>
        <div class="sc-right">
          <div class="sc-city">${c.name}</div>
          <div class="sc-country">${c.country}</div>
          <div class="sc-desc">${c.desc}</div>
        </div>
        <div class="sc-details">
          <span><i class="fas fa-droplet"></i> ${c.humidity}%</span>
          <span><i class="fas fa-wind"></i> ${c.wind} km/h</span>
          <span><i class="fas fa-temperature-half"></i> ${c.feels}°</span>
        </div>
      </div>`
    ).join('');
    attachSuggestionListeners();
  } catch {
    // keep skeleton cards clickable
  }
}

function attachSuggestionListeners() {
  $('#suggestions-grid').querySelectorAll('.suggestion-card').forEach((card) => {
    card.addEventListener('click', () => {
      const { lat, lon, name, country } = card.dataset;
      cityInput.value = name;
      error.classList.add('hidden');
      showLoading();
      fetchAndRender(parseFloat(lat), parseFloat(lon), name, country);
    });
  });
}

function showDidYouMean(query, matches) {
  hideAutocomplete();
  loading.classList.add('hidden');
  mainContent.classList.add('hidden');
  error.classList.remove('hidden');
  errorMsg.textContent = `No exact match for "${query}"`;

  const dym = $('#did-you-mean');
  dym.classList.remove('hidden');
  dym.innerHTML = `<p>Did you mean</p>` + matches.slice(0, 4).map((c) =>
    `<span class="dym-chip" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}" data-country="${c.country || ''}">${c.name}${c.state ? ', ' + c.state : ''}, ${c.country || ''}</span>`
  ).join('');

  dym.querySelectorAll('.dym-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const { lat, lon, name, country } = chip.dataset;
      cityInput.value = name;
      error.classList.add('hidden');
      showLoading();
      fetchAndRender(parseFloat(lat), parseFloat(lon), name, country);
    });
  });

  showPopularSuggestions();
}

function showError(msg) {
  hideAutocomplete();
  loading.classList.add('hidden');
  mainContent.classList.add('hidden');
  errorMsg.textContent = msg;
  $('#did-you-mean').classList.add('hidden');
  error.classList.remove('hidden');
  showPopularSuggestions();
}

function formatDateTime(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHour(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

function formatDay(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatShortDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ===== THEME TOGGLE =====
const themeBtn = $('#theme-btn');
const themeIcon = themeBtn.querySelector('i');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('theme', theme);
}

themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Apply saved theme
applyTheme(localStorage.getItem('theme') || 'dark');

// ===== INIT =====
// Load demo data on start
renderDemo('Jabalpur');
