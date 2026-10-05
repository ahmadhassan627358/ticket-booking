const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🎯 Setting up direct Sargodha, Lahore, Islamabad & Faisalabad express routes...");

  // 1. Ensure Cities exist
  const cities = ["Sargodha", "Faisalabad", "Lahore", "Islamabad", "Rawalpindi"];
  const cityMap = new Map();
  for (const name of cities) {
    const city = await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    cityMap.set(name, city.id);
  }

  // 2. Direct Express Routes
  const specificRoutes = [
    {
      name: "Sargodha - Faisalabad Direct",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 650 },
      ],
    },
    {
      name: "Sargodha - Islamabad Direct",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 1100 },
      ],
    },
    {
      name: "Sargodha - Lahore Direct",
      stops: [
        { city: "Sargodha", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Lahore", stopOrder: 2, fareFromOrigin: 1150 },
      ],
    },
    {
      name: "Lahore - Islamabad (Motorway M2 Express)",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 2200 },
      ],
    },
    {
      name: "Lahore - Sargodha - Islamabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Sargodha", stopOrder: 2, fareFromOrigin: 1150 },
        { city: "Islamabad", stopOrder: 3, fareFromOrigin: 2200 },
      ],
    },
    {
      name: "Faisalabad - Islamabad Direct",
      stops: [
        { city: "Faisalabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Islamabad", stopOrder: 2, fareFromOrigin: 1500 },
      ],
    },
    {
      name: "Lahore - Faisalabad",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 950 },
      ],
    },
  ];

  const processedRoutes = [];
  for (const rData of specificRoutes) {
    let route = await prisma.route.findFirst({
      where: { name: rData.name },
      include: { stops: true },
    });

    if (!route) {
      route = await prisma.route.create({
        data: {
          name: rData.name,
          stops: {
            create: rData.stops.map((s) => ({
              cityId: cityMap.get(s.city),
              stopOrder: s.stopOrder,
              fareFromOrigin: s.fareFromOrigin,
            })),
          },
        },
        include: { stops: true },
      });
      console.log(`✅ Created Route: ${route.name}`);
    } else {
      console.log(`ℹ️ Route already exists: ${route.name}`);
    }
    processedRoutes.push(route);
  }

  // 3. Fetch all available buses
  const buses = await prisma.bus.findMany();

  // 4. Generate Frequent Departures (Every 2 Hours throughout day & night) for next 21 days
  console.log("📅 Scheduling high-frequency departures (every 2-3 hours) in both directions...");

  const departureHours = [
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

    for (const route of processedRoutes) {
      for (const timeStr of departureHours) {
        const [h, m] = timeStr.split(":").map(Number);
        const depTime = new Date(targetDate);
        depTime.setHours(h, m, 0, 0);

        // Forward Direction (e.g. SGD -> FSD, SGD -> ISB, SGD -> LHR, LHR -> ISB)
        tripsToCreate.push({
          routeId: route.id,
          busId: buses[busIdx % buses.length].id,
          direction: "FORWARD",
          departureTime: depTime,
          status: "SCHEDULED",
        });
        busIdx++;

        // Reverse Direction (e.g. FSD -> SGD, ISB -> SGD, LHR -> SGD, ISB -> LHR)
        const reverseDepTime = new Date(depTime);
        reverseDepTime.setMinutes(reverseDepTime.getMinutes() + 15); // slightly offset reverse timing

        tripsToCreate.push({
          routeId: route.id,
          busId: buses[busIdx % buses.length].id,
          direction: "REVERSE",
          departureTime: reverseDepTime,
          status: "SCHEDULED",
        });
        busIdx++;
      }
    }
  }

  console.log(`Generated ${tripsToCreate.length} trips. Bulk inserting in chunks...`);
  const chunkSize = 250;
  for (let i = 0; i < tripsToCreate.length; i += chunkSize) {
    const chunk = tripsToCreate.slice(i, i + chunkSize);
    await prisma.trip.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Inserted batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(tripsToCreate.length / chunkSize)}`);
  }

  const totalScheduled = await prisma.trip.count({
    where: { status: "SCHEDULED" },
  });

  console.log(`\n🎉 ALL ROUTES CONFIGURED! Total Active Scheduled Trips: ${totalScheduled}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
