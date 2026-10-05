const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Filtering database to ONLY 4 requested cities: Lahore, Islamabad, Sargodha, Faisalabad...");

  // 1. Target Cities
  const allowedCities = ["Lahore", "Islamabad", "Sargodha", "Faisalabad"];

  // 2. Clean up trips, route stops, and routes that belong to other cities
  console.log("Cleaning up old trips & routes...");
  await prisma.payment.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  
  // Delete cities not in allowed list
  await prisma.city.deleteMany({
    where: {
      name: { notIn: allowedCities }
    }
  });

  // Ensure 4 cities exist
  const cityMap = new Map();
  for (const name of allowedCities) {
    const city = await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    cityMap.set(name, city.id);
  }
  console.log(`✅ Database now has ONLY ${cityMap.size} cities: ${allowedCities.join(", ")}`);

  // 3. Define the exact routes between these 4 cities
  const cleanRoutes = [
    {
      name: "Sargodha - Faisalabad",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 650 },
      ],
    },
    {
      name: "Sargodha - Islamabad",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 1100 },
      ],
    },
    {
      name: "Sargodha - Lahore",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Lahore", stopOrder: 2, fareFromOrigin: 1150 },
      ],
    },
    {
      name: "Lahore - Islamabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 2200 },
      ],
    },
    {
      name: "Lahore - Faisalabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 950 },
      ],
    },
    {
      name: "Faisalabad - Islamabad",
      stops: [
        { city: "Faisalabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 1500 },
      ],
    },
  ];

  const createdRoutes = [];
  for (const r of cleanRoutes) {
    const created = await prisma.route.create({
      data: {
        name: r.name,
        stops: {
          create: r.stops.map((s) => ({
            cityId: cityMap.get(s.city),
            stopOrder: s.stopOrder,
            fareFromOrigin: s.fareFromOrigin,
          })),
        },
      },
    });
    createdRoutes.push(created);
    console.log(`✅ Created Route: ${created.name}`);
  }

  // 4. Ensure Buses exist
  const buses = await prisma.bus.findMany();

  // 5. Generate frequent daily trips (Hourly / Bi-hourly) in FORWARD and REVERSE directions for next 21 days
  const departureTimes = [
    "06:00", "07:30", "09:00", "10:30", "12:00", "13:30",
    "15:00", "16:30", "18:00", "19:30", "21:00", "22:30", "23:59"
  ];

  const tripsToCreate = [];
  let busIdx = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 0; day < 21; day++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + day);

    for (const route of createdRoutes) {
      for (const timeStr of departureTimes) {
        const [h, m] = timeStr.split(":").map(Number);
        const depTime = new Date(targetDate);
        depTime.setHours(h, m, 0, 0);

        // FORWARD
        tripsToCreate.push({
          routeId: route.id,
          busId: buses[busIdx % buses.length].id,
          direction: "FORWARD",
          departureTime: depTime,
          status: "SCHEDULED",
        });
        busIdx++;

        // REVERSE
        const revTime = new Date(depTime);
        revTime.setMinutes(revTime.getMinutes() + 15);
        tripsToCreate.push({
          routeId: route.id,
          busId: buses[busIdx % buses.length].id,
          direction: "REVERSE",
          departureTime: revTime,
          status: "SCHEDULED",
        });
        busIdx++;
      }
    }
  }

  console.log(`Inserting ${tripsToCreate.length} trips...`);
  const chunkSize = 250;
  for (let i = 0; i < tripsToCreate.length; i += chunkSize) {
    const chunk = tripsToCreate.slice(i, i + chunkSize);
    await prisma.trip.createMany({
      data: chunk,
    });
  }

  const finalTripsCount = await prisma.trip.count();
  const finalCities = await prisma.city.findMany();
  console.log(`\n🎉 DONE! Only ${finalCities.length} Cities in database:`);
  finalCities.forEach((c) => console.log(`  - ${c.name}`));
  console.log(`Total Trips: ${finalTripsCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
