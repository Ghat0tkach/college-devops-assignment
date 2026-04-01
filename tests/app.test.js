/**
 * Basic tests for the Weather Dashboard
 * Run with: node tests/app.test.js
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

// ===== File existence tests =====
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

console.log('\n📁 File existence tests:');
assert(fs.existsSync(path.join(root, 'index.html')), 'index.html exists');
assert(fs.existsSync(path.join(root, 'style.css')), 'style.css exists');
assert(fs.existsSync(path.join(root, 'app.js')), 'app.js exists');
assert(fs.existsSync(path.join(root, 'Dockerfile')), 'Dockerfile exists');

// ===== HTML structure tests =====
console.log('\n🏗️  HTML structure tests:');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
assert(html.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
assert(html.includes('id="city-input"'), 'Has city input');
assert(html.includes('id="main-content"'), 'Has main content area');
assert(html.includes('id="hourly-container"'), 'Has hourly forecast container');
assert(html.includes('id="daily-container"'), 'Has daily forecast container');
assert(html.includes('style.css'), 'Links to style.css');
assert(html.includes('app.js'), 'Links to app.js');

// ===== CSS tests =====
console.log('\n🎨 CSS tests:');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf-8');
assert(css.includes('--bg:'), 'Has CSS variables');
assert(css.includes('backdrop-filter'), 'Uses glassmorphism');
assert(css.includes('@keyframes'), 'Has animations');
assert(css.includes('@media'), 'Has responsive breakpoints');

// ===== JS tests =====
console.log('\n⚙️  JS tests:');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf-8');
assert(js.includes('renderCurrent'), 'Has renderCurrent function');
assert(js.includes('renderHourly'), 'Has renderHourly function');
assert(js.includes('renderDaily'), 'Has renderDaily function');
assert(js.includes('renderAQI'), 'Has renderAQI function');
assert(js.includes('getDemoData'), 'Has demo data for offline use');
assert(js.includes('addEventListener'), 'Has event listeners');

// ===== Dockerfile tests =====
console.log('\n🐳 Dockerfile tests:');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf-8');
assert(dockerfile.includes('FROM nginx'), 'Uses nginx base image');
assert(dockerfile.includes('EXPOSE 80'), 'Exposes port 80');
assert(dockerfile.includes('index.html'), 'Copies index.html');

// ===== API tests =====
async function runApiTests() {
  console.log('\n🌐 API tests:');

  const API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; // OpenWeatherMap public sample API key
  const BASE = 'https://api.openweathermap.org/data/2.5';

  try {
    // Test current weather endpoint
    const weatherRes = await fetch(`${BASE}/weather?q=Jabalpur&units=metric&appid=${API_KEY}`);
    const weatherData = await weatherRes.json();
    assert(weatherRes.ok, `Current weather API responds (status ${weatherRes.status})`);
    assert(weatherData.main && typeof weatherData.main.temp === 'number', `Returns valid temperature: ${weatherData.main?.temp}°C`);
    assert(weatherData.name === 'Jabalpur', `Returns correct city: ${weatherData.name}`);
  } catch (err) {
    assert(false, `Current weather API call failed: ${err.message}`);
  }

  try {
    // Test forecast endpoint
    const forecastRes = await fetch(`${BASE}/forecast?q=Jabalpur&units=metric&appid=${API_KEY}`);
    const forecastData = await forecastRes.json();
    assert(forecastRes.ok, `Forecast API responds (status ${forecastRes.status})`);
    assert(forecastData.list && forecastData.list.length > 0, `Returns forecast entries: ${forecastData.list?.length}`);
  } catch (err) {
    assert(false, `Forecast API call failed: ${err.message}`);
  }

  try {
    // Test air pollution endpoint
    const aqiRes = await fetch(`${BASE}/air_pollution?lat=23.18&lon=79.95&appid=${API_KEY}`);
    const aqiData = await aqiRes.json();
    assert(aqiRes.ok, `Air quality API responds (status ${aqiRes.status})`);
    assert(aqiData.list?.[0]?.main?.aqi >= 1, `Returns valid AQI: ${aqiData.list?.[0]?.main?.aqi}`);
  } catch (err) {
    assert(false, `Air quality API call failed: ${err.message}`);
  }

  // ===== Summary =====
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runApiTests();
