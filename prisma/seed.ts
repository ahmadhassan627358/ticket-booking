import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Role, BusType, TripDirection, TripStatus } from "../src/types/enums";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for Safar Express...");

  // 1. Clean existing data (respecting foreign key dependencies)
  console.log("🧹 Cleaning old records...");
  await prisma.payment.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.city.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users (1 Admin, 3 Customers)
  console.log("👤 Seeding users...");
  const adminPasswordHash = await bcrypt.hash("Ali@bbas1801", 10);
  const customerPasswordHash = await bcrypt.hash("Customer@123", 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Ahmad Hassan (Admin)",
      email: "ahmaddeveloper2003@gmail.com",
      phone: "+923001234567",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const customersData = [
    {
      name: "Ali Khan",
      email: "ali.khan@gmail.com",
      phone: "+923009876541",
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
    {
      name: "Fatima Noor",
      email: "fatima.noor@gmail.com",
      phone: "+923009876542",
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
    {
      name: "Usman Tariq",
      email: "usman.tariq@gmail.com",
      phone: "+923009876543",
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
  ];

  for (const cust of customersData) {
    await prisma.user.create({ data: cust });
  }
  console.log("✅ Users seeded (1 Admin: admin@safar.pk, 3 Customers).");

  // 3. Seed Cities
  console.log("🏙️ Seeding cities...");
  const cityNames = [
    "Lahore",
    "Sargodha",
    "Islamabad",
    "Multan",
    "Sukkur",
    "Karachi",
    "Peshawar",
    "Faisalabad",
  ];

  const cityMap = new Map<string, string>();
  for (const name of cityNames) {
    const city = await prisma.city.create({
      data: { name },
    });
    cityMap.set(name, city.id);
  }
  console.log(`✅ ${cityMap.size} cities created.`);

  // 4. Seed Routes & RouteStops
  console.log("🛣️ Seeding routes & route stops...");
  const routesData = [
    {
      name: "Lahore - Sargodha - Islamabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Sargodha", stopOrder: 2, fareFromOrigin: 1200 },
        { city: "Islamabad", stopOrder: 3, fareFromOrigin: 2200 },
      ],
    },
    {
      name: "Lahore - Multan - Sukkur - Karachi",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Multan", stopOrder: 2, fareFromOrigin: 1500 },
        { city: "Sukkur", stopOrder: 3, fareFromOrigin: 3200 },
        { city: "Karachi", stopOrder: 4, fareFromOrigin: 4800 },
      ],
    },
    {
      name: "Islamabad - Peshawar",
      stops: [
        { city: "Islamabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Peshawar", stopOrder: 2, fareFromOrigin: 1100 },
      ],
    },
    {
      name: "Lahore - Faisalabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 900 },
      ],
    },
  ];

  const createdRoutes = [];
  for (const routeInfo of routesData) {
    const route = await prisma.route.create({
      data: {
        name: routeInfo.name,
        stops: {
          create: routeInfo.stops.map((s) => ({
            cityId: cityMap.get(s.city)!,
            stopOrder: s.stopOrder,
            fareFromOrigin: s.fareFromOrigin,
          })),
        },
      },
      include: {
        stops: true,
      },
    });
    createdRoutes.push(route);
  }
  console.log(`✅ ${createdRoutes.length} routes seeded with route stops.`);

  // 5. Seed Buses (3 BUSINESS 2x1 30 seats, 3 EXECUTIVE 2x2 44 seats)
  console.log("🚌 Seeding buses...");
  const busesData = [
    { number: "BUS-101 (Daewoo Royal)", type: BusType.BUSINESS, totalSeats: 30, layout: "2x1" },
    { number: "BUS-102 (Scania Elite)", type: BusType.BUSINESS, totalSeats: 30, layout: "2x1" },
    { number: "BUS-103 (Yutong Prime)", type: BusType.BUSINESS, totalSeats: 30, layout: "2x1" },
    { number: "BUS-201 (Volvo Master)", type: BusType.EXECUTIVE, totalSeats: 44, layout: "2x2" },
    { number: "BUS-202 (Higer Grand)", type: BusType.EXECUTIVE, totalSeats: 44, layout: "2x2" },
    { number: "BUS-203 (Daewoo Premier)", type: BusType.EXECUTIVE, totalSeats: 44, layout: "2x2" },
  ];

  const createdBuses = [];
  for (const b of busesData) {
    const bus = await prisma.bus.create({ data: b });
    createdBuses.push(bus);
  }
  console.log(`✅ ${createdBuses.length} buses seeded.`);

  // 6. Seed Trips for next 14 days (2-3 departures daily per route per direction)
  console.log("📅 Seeding trips for the next 14 days...");
  const departureTimesForward = ["08:00", "14:00", "20:00"];
  const departureTimesReverse = ["09:00", "15:00", "21:00"];

  let totalTrips = 0;
  let busIndex = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);

    for (const route of createdRoutes) {
      // Forward direction departures (2-3 daily)
      for (const timeStr of departureTimesForward) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const depTime = new Date(currentDate);
        depTime.setHours(hours, minutes, 0, 0);

        const assignedBus = createdBuses[busIndex % createdBuses.length];
        busIndex++;

        await prisma.trip.create({
          data: {
            routeId: route.id,
            busId: assignedBus.id,
            direction: TripDirection.FORWARD,
            departureTime: depTime,
            status: TripStatus.SCHEDULED,
          },
        });
        totalTrips++;
      }

      // Reverse direction departures (2-3 daily)
      for (const timeStr of departureTimesReverse) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const depTime = new Date(currentDate);
        depTime.setHours(hours, minutes, 0, 0);

        const assignedBus = createdBuses[busIndex % createdBuses.length];
        busIndex++;

        await prisma.trip.create({
          data: {
            routeId: route.id,
            busId: assignedBus.id,
            direction: TripDirection.REVERSE,
            departureTime: depTime,
            status: TripStatus.SCHEDULED,
          },
        });
        totalTrips++;
      }
    }
  }

  console.log(`✅ Created ${totalTrips} scheduled trips spanning 14 days.`);
  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
