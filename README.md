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
- [Database](#database)
- [Running the API](#running-the-api)
- [API Routes](#api-routes)
- [Route Reference](#route-reference)
  - [Vehicles](#vehicles)
  - [Stations](#stations)
  - [Drivers](#drivers)
  - [Fueling Events](#fueling-events)

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

**Response `200`** — array of fueling event objects (same shape as `POST /stations/:id/events` response, without `message`).`<p align="center">`
  `<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />``</a>`

</p>
