# UAC Predictive Intelligence — MERN + Real Training Dataset

This version uses the uploaded **HHS Unaccompanied Alien Children Program** CSV as the application's actual data source.

## What changed from the prototype

- 720 valid dated observations are imported from the uploaded CSV; blank rows are ignored.
- MongoDB stores the cleaned records.
- Executive KPIs are calculated from the real latest observation and rolling windows.
- Historical charts use the real dataset instead of browser-generated random values.
- The forecast endpoint trains a **Recent-Window Random Forest Regression** model on the imported data using lag/rolling features. It is intentionally named Random Forest rather than XGBoost because the supplied HTML did not contain an executable XGBoost model.
- Forecast error metrics are calculated from an actual time-ordered holdout.
- Transfer/discharge forecasts use recent observed averages and the care-load model forecasts recursively.
- Capacity stress simulation uses the real latest census.
- Benchmarking includes the actual recent-window model and simple baselines evaluated on the same holdout.

## Stack

- MongoDB / Mongoose
- Express / Node.js
- React / Vite
- Recharts
- `ml-random-forest` for the real server-side regression model

## Run

### 1. Start MongoDB

Start a local MongoDB service or use a MongoDB Atlas connection string.

Create `server/.env` from `.env.example` and set `MONGODB_URI`.

On Windows, a local installation commonly runs as the `MongoDB` service. If you use Atlas, replace the local URI with your Atlas URI and URL-encode any special characters in the username or password.

### 2. Install and import the dataset

```bash
cd server
npm install
npm run seed
npm run dev
```

`npm run seed` reads `server/data/training.csv`, cleans it, and inserts the valid rows into MongoDB.

### 3. Start React

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL.

## API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/history`
- `GET /api/benchmarks`
- `GET /api/discharges`
- `GET /api/forecast?horizon=30&scenario=base`
- `GET /api/stress?capacity=2600&nip=15&days=30`

## Important ML note

The original dashboard reported an XGBoost MAE of 5.48, but the supplied frontend code actually generated simulated trajectories rather than loading an XGBoost model. This application therefore uses a real trainable tree ensemble against the uploaded CSV and reports the measured metrics it obtains. If an exact XGBoost model is required, the next step is to replace the model service with a Python XGBoost microservice while retaining this MERN UI/API.
