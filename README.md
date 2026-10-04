# Safar Express (سفر ایکسپریس) 🚌

Pakistan's premier intercity bus ticket booking and transit operations platform. Built using **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Zod**, and **pdf-lib**.

---

## 🌟 Key Features

- **Dynamic Intercity Trip Search**: Multi-city corridor search with intermediate stop detection, forward/reverse direction routing, and fare calculations.
- **Interactive Bus Seat Layouts**: Real-time visual seat map supporting **Business (2x1 luxury)** and **Executive (2x2)** coaches.
- **Adjacent Gender Protection**: Enforces Pakistani transit gender rules (e.g. single male cannot select a seat next to an unrelated female passenger in paired rows).
- **Segment-Based Seat Availability**: Dynamic seat allocation allowing the same seat to be booked on non-overlapping legs of a multi-stop corridor (e.g. Lahore → Multan, then Multan → Karachi).
- **Concurrency & 10-Minute Seat Locking**: Prevents double-booking during checkout with automatic expiration and cleanup.
- **Payment Abstraction Layer**: Pluggable payment architecture supporting **Mock Online Payment** (cards/wallets) and **Cash at Terminal** counter reservations.
- **Official E-Ticket PDF with QR Code**: Vector-drawn, print-ready A4 ticket PDF with embedded verification QR code.
- **Public & Authenticated Ticket Tracking**: Lookup by 8-character PNR + phone, with direct cancellation and refund previews.
- **Automated Refund Policy Engine**:
  - $>24$ hours prior to departure: **100% Full Refund**
  - $6 - 24$ hours prior to departure: **75% Refund**
  - $<6$ hours prior to departure: **50% Refund**
  - Past departure: **0% (Non-refundable)**
  - Operator trip cancellation: **100% Full Refund & Seat Release**
- **Complete Admin Control Center**:
  - **Dashboard**: Live metric cards (Today's Bookings, Today's Revenue, Seats Sold, Active Trips, Avg Occupancy %), 7-day interactive sales chart, and next 10 upcoming trips table.
  - **Bookings Management**: Real-time search by PNR, phone, or name; status & route filters; passenger manifest modal; cash payment confirmation button; and administrative cancellation with refund.
  - **Reports & Analytics**: Daily/weekly sales volume, corridor performance matrix, and one-click RFC 4180 **CSV Export**.
  - **Trip Generator**: Single schedule creation and recurring **Bulk Generator** across date ranges and time slots.
  - **Fleet & Route Management**: CRUD for buses, routes with reorderable stops, and cities.

---

## 🚀 Technology Stack

- **Framework**: Next.js 14.2 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS & Vanilla CSS Design System
- **Database & ORM**: Prisma ORM with SQLite (switchable to PostgreSQL)
- **Authentication**: NextAuth.js (Credentials Provider + Role-Based Admin Access)
- **Validation**: Zod & Regex sanitizers
- **Security & Rate Limiting**: In-memory token bucket rate limiting on auth, bookings, and seat locking
- **PDF Generation**: `pdf-lib` and `qrcode`
- **Icons**: Lucide React

---

## 📦 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18.17+ or v20+)
- **npm** / **yarn** / **pnpm**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-repo/safar-express.git
cd ticket-booking
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```

Default `.env` configuration:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="safar-express-secret-key-2026-production"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_SECRET="safar-admin-secret-2026"
```

### 4. Database Migration & Seeding
```bash
# Run Prisma schema migrations
npm run prisma:migrate

# Seed master routes, cities, fleet, trips, and demo users
npm run prisma:seed
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Seeded Credentials

| Role | Name | Email | Password | Phone |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Safar | `admin@safar.pk` | `Admin@123` | `+923001234567` |
| **Customer** | Ali Khan | `ali.khan@gmail.com` | `Customer@123` | `+923009876541` |
| **Customer** | Fatima Noor | `fatima.noor@gmail.com` | `Customer@123` | `+923009876542` |
| **Customer** | Usman Tariq | `usman.tariq@gmail.com` | `Customer@123` | `+923009876543` |

---

## 📁 Project Structure

```
ticket-booking/
├── prisma/
│   ├── schema.prisma              # Database schema (User, City, Route, Bus, Trip, Booking, etc.)
│   └── seed.ts                    # Master database seeding script
├── scripts/
│   ├── test-core-business-logic.js # Unit & integration test suite (Fares, Segments, Gender, Concurrency, Refunds)
│   ├── test-admin-complete.js     # Admin dashboard, bookings, reports & CSV export test suite
│   ├── test-admin-panel.js        # Admin fleet, routes, and bulk trip generator tests
│   ├── test-booking-flow.js       # Customer booking, seat lock & payment tests
│   ├── test-ticket-and-cancellation.js # E-Ticket PDF and cancellation refund tiers tests
│   ├── test-search.js             # Route search & segment fare tests
│   └── test-auth.js               # NextAuth & registration tests
├── src/
│   ├── app/
│   │   ├── admin/                 # Admin control center
│   │   │   ├── bookings/          # Bookings table, cash confirmation & refund actions
│   │   │   ├── reports/           # Business reports, corridor matrix & CSV export
│   │   │   ├── trips/             # Schedule manager & bulk trip generator
│   │   │   ├── routes/            # Routes & stop fare configuration
│   │   │   ├── buses/             # Fleet inventory & seat layout manager
│   │   │   ├── cities/            # Terminal city master data
│   │   │   ├── layout.tsx         # Admin sidebar & role authorization guard
│   │   │   └── page.tsx           # Admin executive dashboard
│   │   ├── api/                   # REST API route handlers
│   │   │   ├── admin/             # Protected admin API routes
│   │   │   ├── auth/              # Registration & NextAuth routes
│   │   │   ├── bookings/          # Customer bookings, PNR lookup, PDF generation & cancellation
│   │   │   ├── cities/            # Cities API
│   │   │   ├── seats/             # Seat locking & availability API
│   │   │   └── trips/             # Trip search & schedule API
│   │   ├── booking/               # Checkout and web ticket confirmation
│   │   ├── my-bookings/           # Authenticated user booking history
│   │   ├── track/                 # Public ticket search & self-service cancellation
│   │   ├── terms/                 # Terms of service and refund policy page
│   │   ├── trips/                 # Search results and interactive seat selector
│   │   ├── login/                 # Login page
│   │   ├── register/              # Registration page
│   │   ├── layout.tsx             # Root layout with Navbar and Footer
│   │   ├── page.tsx               # Landing page with hero search & How it works
│   │   ├── loading.tsx            # Global loading state
│   │   └── error.tsx              # Global error boundary
│   ├── components/
│   │   ├── admin/                 # Admin client components (Dashboard, Modals, Dialogs)
│   │   ├── Navbar.tsx             # Responsive header with mobile drawer
│   │   ├── Footer.tsx             # Responsive multi-column footer
│   │   ├── SearchForm.tsx         # Intercity route search widget
│   │   └── PopularRoutes.tsx      # Popular route corridor cards
│   ├── lib/
│   │   ├── adminAuth.ts           # Admin authorization helper
│   │   ├── adminValidations.ts    # Admin Zod schemas
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── busLayout.ts           # Bus seat layout & adjacent pairing engine
│   │   ├── payments/              # Payment provider abstraction (Cash, Mock Online)
│   │   ├── pnr.ts                 # Unique 8-character PNR generator
│   │   ├── prisma.ts              # Prisma singleton client
│   │   ├── rateLimit.ts           # Token bucket in-memory rate limiter
│   │   ├── refundPolicy.ts        # Automated refund calculation rules
│   │   ├── ticketPdf.ts           # PDF-lib official E-Ticket generator & CNIC mask
│   │   └── validations.ts         # Customer validation & Pakistani regex normalizers
│   └── types/
│       └── enums.ts               # Domain constants and types
└── README.md
```

---

## 🧪 Automated Testing

Run the complete test suite across all subsystems:

```bash
# 1. Core Domain & Business Logic (Fares, Segments, Gender, Concurrency, Refunds)
node scripts/test-core-business-logic.js

# 2. Complete Admin Panel & Reporting (Dashboard, Bookings, Reports, CSV Export)
node scripts/test-admin-complete.js

# 3. Admin Fleet, Routes & Bulk Generator
node scripts/test-admin-panel.js

# 4. E-Ticket PDF with QR & Cancellation Tiers
node scripts/test-ticket-and-cancellation.js

# 5. Customer Booking & Payment Flow
node scripts/test-booking-flow.js

# 6. Route Search & Segment Fares
node scripts/test-search.js

# 7. User Authentication & Registration
node scripts/test-auth.js
```

---

## 🔮 What is NOT Implemented Yet (Future Scope)

The following items are intentionally designed with extensible abstractions and represent recommended production upgrades:

1. **Production JazzCash & Easypaisa Merchant Gateways**:
   - The payment layer (`src/lib/payments/`) contains the interface and mock provider. Production deployment requires plugging in actual Merchant IPN credentials and webhook verification.
2. **Live SMS & WhatsApp OTP Gateway**:
   - PNR and confirmation alerts are currently accessible via instant web view and downloadable PDF. Production deployment requires connecting Twilio or a local Pakistani SMS gateway (e.g. Infobip / BrandSMS).
3. **Dedicated Terminal Counter Staff / POS Operator Role**:
   - Terminal counter operations (cash payment collection, over-the-counter ticket issuance) are currently handled by the `ADMIN` role. A granular `COUNTER_STAFF` role can be added to restrict access to terminal-specific check-ins.
4. **Live GPS Vehicle Telemetry**:
   - Vehicle location tracking on an interactive map.

---

## 📄 License
This project is proprietary and developed for Safar Express transit operations.
