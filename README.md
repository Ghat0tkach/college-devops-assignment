# WeatherPulse - Weather Dashboard

> **College DevOps Assignment**
> **Name:** Vikramaditya Singh
> **Enrollment No:** 0201AI221076
>
> Build a small web app, Dockerize it, push to GitHub, and configure a CI/CD pipeline (test → build Docker image → deploy).

A sleek, modern weather dashboard built with vanilla HTML, CSS, and JavaScript. Features glassmorphism UI, animated backgrounds, and real-time weather data from OpenWeatherMap.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## Features

- **Real-time weather data** — current conditions, hourly & 5-day forecast
- **Air quality index** with pollutant breakdown (PM2.5, PM10, O3, NO2, SO2, CO)
- **Sunrise/sunset arc** with animated sun position
- **Glassmorphism UI** with floating animated background blobs
- **Fully responsive** — works on mobile, tablet, and desktop
- **Geolocation support** — fetch weather for your current location
- **Demo mode** — works offline with sample data when API is unavailable

## Tech Stack

| Layer       | Technology                  |
| ----------- | --------------------------- |
| Frontend    | HTML5, CSS3, Vanilla JS     |
| API         | OpenWeatherMap (free tier)  |
| Container   | Docker + Nginx Alpine       |
| CI/CD       | GitHub Actions              |
| Deployment  | GitHub Pages                |

## Getting Started

### Run Locally

Just open `index.html` in your browser — no build step needed.

### Run with Docker

```bash
docker build -t weather-dashboard .
docker run -d -p 8080:80 weather-dashboard
```

Then visit `http://localhost:8080`.

## API

Uses the [OpenWeatherMap](https://openweathermap.org/api) free-tier endpoints:

- `/weather` — current conditions
- `/forecast` — 5-day / 3-hour forecast
- `/air_pollution` — air quality index

The app uses a public sample API key by default. To use your own, update `API_KEY` in `app.js`.

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on every push to `main`:

1. **Test** — runs 31 tests (file structure, HTML/CSS/JS validation, live API checks)
2. **Build Docker** — builds the image and smoke-tests the container
3. **Deploy** — publishes to GitHub Pages

## Project Structure

```
weather-dashboard/
├── index.html                      # Main app
├── style.css                       # Glassmorphism dark theme
├── app.js                          # Weather logic + API integration
├── Dockerfile                      # Nginx-based container
├── .dockerignore
├── tests/
│   └── app.test.js                 # 31 tests (structure + live API)
└── .github/
    └── workflows/
        └── ci-cd.yml               # CI/CD pipeline
```

## License

MIT
