# BioPoints API

**Biofuel Loyalty & Emissions Reward Platform**
Pilot city: Salvador, Bahia, Brazil
Domains: Smart Cities · Climate Change · Energetic Transition

BioPoints rewards drivers for choosing biodiesel over fossil fuels. Each fueling event triggers a CO₂ prediction model that converts estimated emissions savings into redeemable loyalty points, creating a direct financial incentive for the energetic transition.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Venv](#venv)
- [Database](#database)
- [Running the API](#running-the-api)
- [API Routes](#api-routes)
- [Route Reference](#route-reference)
  - [Vehicles](#vehicles)
  - [Stations](#stations)
  - [Drivers](#drivers)
  - [Fueling Events](#fueling-events)
- [ML Model FAQ](#ml-model-faq)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   NestJS REST API                   │
│  Vehicle · Driver · Station · Events · Prediction   │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
   ┌─────▼──────┐        ┌───────▼────────┐
   │ PostgreSQL  │        │  Python Script  │
   │  (Prisma)  │        │  predict.py     │
   └────────────┘        │  Random Forest  │
                         └────────────────┘
```

**Stack**

- Backend: Node.js · NestJS · Prisma ORM
- Database: PostgreSQL
- Prediction model: Python 3 · scikit-learn (Random Forest Regressor)
- Reference dataset: `co2.csv` (used to train the model and seed `VehicleSpec`)

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL ≥ 14
- Python 3 with `scikit-learn`, `pandas`, and `joblib` installed
- `python3` available on your system PATH

---

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/biopoints-api.git
cd biopoints-api
npm install
```

### 2. Install the CSV parser (required for the seed script)

```bash
npm install --save-dev csv-parse
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/biopoints"
PORT=3000
```

See [Environment Variables](#environment-variables) for details on each field.

### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed the VehicleSpec reference table

Place your `co2.csv` file at `prisma/data/co2.csv`, then run:

```bash
npx prisma db seed
```

This reads every row from `co2.csv` and inserts it into the `VehicleSpec` table. It is safe to re-run — duplicate rows are skipped automatically.

---

## Environment Variables

| Variable         | Description                                | Example                                             |
| ---------------- | ------------------------------------------ | --------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string               | `postgresql://user:pass@localhost:5432/biopoints` |
| `PORT`         | Port the API listens on (default:`3000`) | `3000`                                            |

---

## Venv

Create venv file:

```bash
python3 -m venv venv
```

Activate venv file:

```bash
source venv/bin/activate
```

After this, install requirements:

```bash
pip install -r requirements.txt
```

---

## Database

The schema contains five models:

| Model            | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `VehicleSpec`  | Read-only reference table seeded from `co2.csv`. Used for spec lookup and model training. |
| `Vehicle`      | Real registered vehicles, linked to drivers. Contains license plate.                        |
| `Driver`       | End users enrolled in the loyalty program.                                                  |
| `Station`      | B2B fuel station partners. Each holds a unique API key.                                     |
| `FuelingEvent` | Each biodiesel transaction. Stores CO₂ prediction outputs and points awarded.              |

To open Prisma Studio and inspect your data visually:

```bash
npx prisma studio
```

---

## Running the API

**Development (with hot reload):**

```bash
npm run start:dev
```

**Production:**

```bash
npm run build
npm run start
```

The API will be available at `http://localhost:3000` (or the port set in `.env`).

---

## API Routes

| #  | Method   | Route                    | Description                            | Auth          |
| -- | -------- | ------------------------ | -------------------------------------- | ------------- |
| 1  | `POST` | `/vehicles`            | Register a vehicle                     | —            |
| 2  | `GET`  | `/vehicles`            | List all vehicles                      | —            |
| 3  | `GET`  | `/vehicles/:id`        | Get vehicle by ID                      | —            |
| 4  | `POST` | `/stations`            | Register a fuel station                | —            |
| 5  | `GET`  | `/stations`            | List all active stations               | —            |
| 6  | `GET`  | `/stations/:id`        | Get station by ID                      | —            |
| 7  | `POST` | `/drivers`             | Register a driver                      | —            |
| 8  | `GET`  | `/drivers/:id`         | Get driver profile & point balance     | —            |
| 9  | `GET`  | `/drivers/:id/events`  | Get driver's fueling history           | —            |
| 10 | `POST` | `/stations/:id/events` | Register a fueling event ← core route | `x-api-key` |
| 11 | `GET`  | `/stations/:id/events` | Get all events at a station            | —            |

> Routes marked with `x-api-key` require the station's API key in the request header.
> The key is returned once when the station is created — store it securely.

---

## Route Reference

The correct order for a first setup is: **vehicle → station → driver → fueling event**.

---

### Vehicles

#### `POST /vehicles`

Registers a vehicle in the platform. The `is_biodiesel_compatible` field is computed automatically from `fuel_type` if not provided — vehicles with `fuel_type: "D"` (diesel) are flagged as compatible.

**Request body**

```json
{
  "plate": "BHZ-1234",
  "brand": "Volkswagen",
  "model": "Delivery 9.170",
  "year": 2021,
  "vehicle_type": "truck",
  "engine_size_l": 5.9,
  "cylinders": 6,
  "transmission": "M6",
  "fuel_type": "D",
  "fuel_consumption_comb": 12.5,
  "is_biodiesel_compatible": true
}
```

**Response `201`**

```json
{
  "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
  "plate": "BHZ-1234",
  "brand": "Volkswagen",
  "model": "Delivery 9.170",
  "year": 2021,
  "vehicle_type": "truck",
  "engine_size_l": 5.9,
  "cylinders": 6,
  "transmission": "M6",
  "fuel_type": "D",
  "fuel_consumption_comb": 12.5,
  "is_biodiesel_compatible": true
}
```

---

#### `GET /vehicles`

Returns all registered vehicles ordered by brand.

**Response `200`**

```json
[
  {
    "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
    "plate": "BHZ-1234",
    "brand": "Volkswagen",
    "model": "Delivery 9.170",
    "year": 2021,
    "vehicle_type": "truck",
    "engine_size_l": 5.9,
    "cylinders": 6,
    "transmission": "M6",
    "fuel_type": "D",
    "fuel_consumption_comb": 12.5,
    "is_biodiesel_compatible": true
  }
]
```

---

#### `GET /vehicles/:id`

Returns a single vehicle by UUID.

**Response `200`** — same shape as a single item from `GET /vehicles`.

**Response `404`**

```json
{
  "message": "Vehicle a1b2c3d4-0000-0000-0000-111122223333 not found.",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### Stations

#### `POST /stations`

Registers a fuel station as a B2B partner. A cryptographically random `api_key` is generated automatically if not supplied. **The key is returned only once — save it immediately.**

**Request body**

```json
{
  "company_name": "Posto BioMax Salvador",
  "cnpj": "12345678000199",
  "address": "Av. Tancredo Neves, 620 - Caminho das Árvores",
  "city": "Salvador",
  "state": "Bahia"
}
```

**Response `201`**

```json
{
  "station_id": "16860955-a634-4212-bd70-a71affac82ae",
  "company_name": "Posto BioMax Salvador",
  "cnpj": "12345678000199",
  "address": "Av. Tancredo Neves, 620 - Caminho das Árvores",
  "city": "Salvador",
  "state": "Bahia",
  "api_key": "0ea6dcd76f25630c4dd498d54a...",
  "is_active": true,
  "created_at": "2025-05-21T14:00:00.000Z"
}
```

---

#### `GET /stations`

Returns all active stations ordered by registration date.

---

#### `GET /stations/:id`

Returns a single station by UUID.

---

### Drivers

#### `POST /drivers`

Registers a driver and links them to a vehicle and a station. `is_eligible` is computed automatically — it is `true` if the linked vehicle has `is_biodiesel_compatible: true`.

**Request body**

```json
{
  "full_name": "Carlos Eduardo Santos",
  "cpf": "12345678900",
  "email": "carlos.santos@email.com",
  "phone": "+55 71 99999-0001",
  "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
  "enrolled_station_id": "16860955-a634-4212-bd70-a71affac82ae"
}
```

**Response `201`**

```json
{
  "driver_id": "6c70bc98-19fa-41f7-b27a-950da8d0eaf0",
  "full_name": "Carlos Eduardo Santos",
  "cpf": "12345678900",
  "email": "carlos.santos@email.com",
  "phone": "+55 71 99999-0001",
  "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
  "enrolled_station_id": "16860955-a634-4212-bd70-a71affac82ae",
  "is_eligible": true,
  "point_balance": 0,
  "created_at": "2025-05-21T14:05:00.000Z",
  "vehicle": {
    "plate": "BHZ-1234",
    "brand": "Volkswagen",
    "model": "Delivery 9.170"
  },
  "enrolled_station": {
    "company_name": "Posto BioMax Salvador"
  }
}
```

---

#### `GET /drivers/:id`

Returns a driver's profile, current point balance, linked vehicle, and enrolled station.

**Response `200`** — same shape as the `POST /drivers` response, with an updated `point_balance` after fueling events.

---

#### `GET /drivers/:id/events`

Returns the full fueling history for a driver, newest first.

**Response `200`**

```json
[
  {
    "event_id": "e9f1a2b3-0000-0000-0000-aabbccddeeff",
    "driver_id": "6c70bc98-19fa-41f7-b27a-950da8d0eaf0",
    "station_id": "16860955-a634-4212-bd70-a71affac82ae",
    "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
    "liters_dispensed": 40,
    "co2_fossil_predicted_g_km": 333.25,
    "co2_biofuel_actual_g_km": 45,
    "co2_saved_g_km": 288.25,
    "efficiency_multiplier": 1.44,
    "points_awarded": 165.84,
    "event_timestamp": "2025-05-21T14:10:00.000Z",
    "station": { "company_name": "Posto BioMax Salvador" },
    "vehicle": { "plate": "BHZ-1234", "brand": "Volkswagen" }
  }
]
```

---

### Fueling Events

#### `POST /stations/:id/events`

**The core route.** Called by the fuel station's POS system when a biodiesel transaction occurs.

Internally it runs the full pipeline:

1. Validates the station's API key
2. Looks up the vehicle by plate
3. Resolves the driver linked to that vehicle
4. Calls the Python prediction model with the vehicle's specs
5. Persists the `FuelingEvent` record
6. Credits the computed points to the driver's balance

**Headers**

```
x-api-key: 0ea6dcd76f25630c4dd498d54a...
Content-Type: application/json
```

**Request body**

```json
{
  "plate": "BHZ-1234",
  "liters_dispensed": 40.0
}
```

**Response `201`**

```json
{
  "event_id": "e9f1a2b3-0000-0000-0000-aabbccddeeff",
  "driver_id": "6c70bc98-19fa-41f7-b27a-950da8d0eaf0",
  "station_id": "16860955-a634-4212-bd70-a71affac82ae",
  "vehicle_id": "a1b2c3d4-0000-0000-0000-111122223333",
  "liters_dispensed": 40,
  "co2_fossil_predicted_g_km": 333.25,
  "co2_biofuel_actual_g_km": 45,
  "co2_saved_g_km": 288.25,
  "efficiency_multiplier": 1.44,
  "points_awarded": 165.84,
  "event_timestamp": "2025-05-21T14:10:00.000Z",
  "message": "165.84 BioPoints awarded to Carlos Eduardo Santos (plate: BHZ-1234).",
  "driver": { "full_name": "Carlos Eduardo Santos", "point_balance": 165.84 },
  "station": { "company_name": "Posto BioMax Salvador" },
  "vehicle": { "plate": "BHZ-1234", "brand": "Volkswagen", "model": "Delivery 9.170" }
}
```

**Response `401`** — missing or invalid API key

```json
{
  "message": "Invalid API key or station is inactive.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Response `404`** — plate not registered

```json
{
  "message": "No vehicle found with plate \"BHZ-1234\". The driver must register before fueling.",
  "error": "Not Found",
  "statusCode": 404
}
```

---

#### `GET /stations/:id/events`

Returns all fueling events recorded at a station, newest first. Useful for B2B reporting dashboards.

**Response `200`** — array of fueling event objects (same shape as `POST /stations/:id/events` response, without `message`).

---

## ML Model FAQ

### What dataset was used to train the model?

The Canadian Government's CO₂ emissions dataset (NRCan), a public dataset where each row represents a unique vehicle model year tested under standardized driving cycles (55% city / 45% highway). The target variable is `CO2_Emissions_g_per_km` — grams of CO₂ emitted per kilometer.

The six features fed to the model are:

| Feature | Type |
|---|---|
| `Engine_Size_L` | Continuous |
| `Cylinders` | Integer |
| `Transmission` | Categorical (e.g. `AS6`, `M5`, `AV7`) |
| `Fuel_Type` | Categorical (`X` regular, `Z` premium, `D` diesel, `E` ethanol, `N` natural gas) |
| `Fuel_Consumption_Comb_L_per_100_km` | Continuous |
| `Vehicle_type` | Categorical (e.g. `MID-SIZE`, `SUV - STANDARD`, `COMPACT`) |

---

### What algorithm was chosen and why not just Linear Regression?

A **Random Forest Regressor** with 100 trees. At each split the model randomly samples `sqrt(n_features)` candidate features before choosing the best one — this is what distinguishes it from plain bagging and reduces the correlation between trees.

For this specific dataset, a linear model with a `Fuel_Consumption × Fuel_Type` interaction term would achieve nearly identical accuracy, because CO₂ emissions are mathematically derived from fuel consumption via a fixed combustion chemistry formula. Random Forest was chosen for two practical reasons: (1) it handles the 20+ categories in `Transmission` and `Vehicle_type` without manually engineering interactions, and (2) the `handle_unknown='ignore'` setting on the encoder means the system degrades gracefully if a novel vehicle class arrives at inference rather than crashing.

---

### Why is there no feature scaling?

Intentional. Tree-based methods are invariant to monotonic transformations of features — rescaling `Engine_Size_L` from 2.0 to a z-score of −0.3 produces identical splits and identical predictions. Adding a `StandardScaler` would have zero effect on model quality and would only complicate the pipeline.

---

### What metrics were reported and what values should we expect?

Training reports **R²** (coefficient of determination) and **MAE** (Mean Absolute Error in g/km).

Expected values on this dataset: **R² ≈ 0.98–0.99**, **MAE ≈ 2–5 g/km**.

Those numbers look impressive, but context matters: CO₂ emissions in this dataset are *physically derived* from fuel consumption using the formula `CO₂ (g/km) = Fuel_Consumption (L/100 km) × CO₂_factor_per_litre / 100`. The relationship is near-deterministic once you know fuel type and fuel consumption. The high R² reflects a domain identity, not a deep statistical discovery. The honest framing is: the model reliably quantifies counterfactual fossil-fuel emissions within ~3–5 g/km, which is all it needs to compute meaningful CO₂-savings incentives.

---

### Why no RMSE? Is MAE sufficient?

MAE is more interpretable for this use case — it reads directly as "average error in g/km." RMSE penalizes large errors quadratically, which matters when a large misprediction for a heavy truck is significantly worse than for a compact car. Neither metric is wrong; RMSE alongside R² would be more standard in a publication. For a production incentive system, MAE is the more actionable number.

---

### Are `Engine_Size_L` and `Cylinders` redundant with `Fuel_Consumption`?

They are highly correlated but not perfectly collinear. Random Forest handles this via the random subspace sampling at each split — correlated features compete for the same split slots, so each one's measured importance is diluted. In practice `Fuel_Consumption_Comb_L_per_100_km` dominates feature importance, while `Engine_Size_L` and `Cylinders` contribute marginally on the residuals. Removing them would slightly increase MAE on unusual vehicles (e.g. high-displacement low-consumption hybrids).

---

### How does the model prevent data leakage in preprocessing?

The entire pipeline is wrapped in a scikit-learn `Pipeline` object. The `OneHotEncoder` is fit only on the training split inside `pipeline.fit(X_train, y_train)` and then applied read-only during `predict()`. If the encoder were fit on the full dataset before the split, category frequency information from the test set would leak into the training distribution. The Pipeline guarantees this cannot happen.

---

### What does `handle_unknown='ignore'` mean in practice?

If a vehicle at inference time carries a `Transmission` or `Vehicle_type` value not seen during training, the encoder sets all corresponding one-hot columns to zero instead of raising an error. The model then relies on the remaining features (engine size, cylinders, fuel consumption) to produce a prediction. This is the correct production behavior — a silent degradation rather than a hard failure.

---

### Is the model actually predicting biodiesel emissions?

No — and that is by design. The model was trained on fossil-fuel vehicle data, so it predicts what CO₂ the vehicle *would emit burning fossil fuel*. This is the **counterfactual baseline**. The actual biodiesel CO₂ is then derived by applying a fixed reduction factor (`BIOFUEL_CO2_FACTOR = 0.30`), meaning B100 biodiesel is modelled as emitting 70% less CO₂ than the fossil-fuel baseline. The difference is the avoided emissions that drive the BioPoints calculation.

One important clarification for a technically precise audience: the 70% figure is a **lifecycle (Well-to-Wheel)** estimate — it accounts for land use, production, and transport of the fuel, not just combustion. At the tailpipe only, B100 CO₂ is similar to conventional diesel. The lifecycle framing is the correct one for a climate impact incentive, but it should be stated explicitly.

---

### Was cross-validation performed?

No. The training script uses a single 80/20 holdout split with `random_state=42`. This gives a reproducible point estimate but no confidence interval on the generalization error. With approximately 7,000 rows in the dataset, a 5-fold cross-validation would provide a more reliable estimate of variance across splits. The `random_state` ensures reproducibility — it does not substitute for cross-validation.

---

### Why save the model with `joblib` instead of `pickle`?

`joblib` is the recommended serialization library for scikit-learn models because it uses memory-mapped NumPy arrays internally, resulting in faster serialization and smaller files when the object contains large arrays (as decision tree ensembles do). Standard `pickle` would produce a functionally equivalent file but slower to write and larger on disk.

`<p align="center">`
  `<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />``</a>`

</p>
