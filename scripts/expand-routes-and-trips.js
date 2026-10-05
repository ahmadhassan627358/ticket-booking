const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Fast Expanding Cities, Routes, Buses & Trips across Pakistan...");

  // 1. Comprehensive Pakistani Cities List
  const cityList = [
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Karachi",
    "Faisalabad",
    "Multan",
    "Peshawar",
    "Sargodha",
    "Sukkur",
    "Gujranwala",
    "Sialkot",
    "Gujrat",
    "Hyderabad",
    "Quetta",
    "Bahawalpur",
    "Abbottabad",
    "Murree",
    "Swat",
    "Sahiwal",
  ];

  const cityMap = new Map();
  for (const name of cityList) {
    const city = await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    cityMap.set(name, city.id);
  }
  console.log(`✅ ${cityMap.size} cities available in database.`);

  // 2. Expand Bus Fleet (Luxury Business 2x1 & Executive 2x2)
  const busesData = [
    { number: "BUS-101 (Daewoo Royal VIP)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-102 (Scania Elite Gold)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-103 (Yutong Prime Deluxe)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-104 (Daewoo Sleeper Club)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-105 (Volvo Crown Royal)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-106 (Scania Touring VIP)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-107 (Yutong Master Line)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },
    { number: "BUS-108 (Daewoo Star Express)", type: "BUSINESS", totalSeats: 30, layout: "2x1" },

    { number: "BUS-201 (Volvo Master Executive)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-202 (Higer Grand Cruiser)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-203 (Daewoo Premier Express)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-204 (Yutong Super Classic)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-205 (Hino Super King)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-206 (Volvo Grand Highway)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-207 (Scania Standard Express)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
    { number: "BUS-208 (Higer Falcon Shuttle)", type: "EXECUTIVE", totalSeats: 44, layout: "2x2" },
  ];

  const allBuses = [];
  for (const b of busesData) {
    const bus = await prisma.bus.upsert({
      where: { number: b.number },
      update: { type: b.type, totalSeats: b.totalSeats, layout: b.layout },
      create: b,
    });
    allBuses.push(bus);
  }
  console.log(`✅ Fleet of ${allBuses.length} modern buses ready.`);

  // 3. Comprehensive Nationwide Routes
  const routesConfig = [
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
        { city: "Sargodha", stopOrder: 2, fareFromOrigin: 1200 },
        { city: "Islamabad", stopOrder: 3, fareFromOrigin: 2200 },
      ],
    },
    {
      name: "Lahore - Gujranwala - Gujrat - Rawalpindi - Peshawar",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Gujranwala", stopOrder: 2, fareFromOrigin: 500 },
        { city: "Gujrat", stopOrder: 3, fareFromOrigin: 800 },
        { city: "Rawalpindi", stopOrder: 4, fareFromOrigin: 2100 },
        { city: "Peshawar", stopOrder: 5, fareFromOrigin: 3200 },
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
      name: "Lahore - Sahiwal - Multan",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Sahiwal", stopOrder: 2, fareFromOrigin: 850 },
        { city: "Multan", stopOrder: 3, fareFromOrigin: 1650 },
      ],
    },
    {
      name: "Lahore - Sialkot (M11 Express)",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Sialkot", stopOrder: 2, fareFromOrigin: 750 },
      ],
    },
    {
      name: "Islamabad - Murree - Abbottabad",
      stops: [
        { city: "Islamabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Murree", stopOrder: 2, fareFromOrigin: 650 },
        { city: "Abbottabad", stopOrder: 3, fareFromOrigin: 1350 },
      ],
    },
    {
      name: "Islamabad - Swat (Mingora)",
      stops: [
        { city: "Islamabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Swat", stopOrder: 2, fareFromOrigin: 1600 },
      ],
    },
    {
      name: "Islamabad - Faisalabad - Multan",
      stops: [
        { city: "Islamabad", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Faisalabad", stopOrder: 2, fareFromOrigin: 1400 },
        { city: "Multan", stopOrder: 3, fareFromOrigin: 2400 },
      ],
    },
    {
      name: "Lahore - Multan - Sukkur - Hyderabad - Karachi",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Multan", stopOrder: 2, fareFromOrigin: 1650 },
        { city: "Sukkur", stopOrder: 3, fareFromOrigin: 3400 },
        { city: "Hyderabad", stopOrder: 4, fareFromOrigin: 4500 },
        { city: "Karachi", stopOrder: 5, fareFromOrigin: 5200 },
      ],
    },
    {
      name: "Multan - Bahawalpur - Sukkur - Karachi",
      stops: [
        { city: "Multan", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Bahawalpur", stopOrder: 2, fareFromOrigin: 600 },
        { city: "Sukkur", stopOrder: 3, fareFromOrigin: 2200 },
        { city: "Karachi", stopOrder: 4, fareFromOrigin: 4100 },
      ],
    },
    {
      name: "Karachi - Quetta (Direct Luxury)",
      stops: [
        { city: "Karachi", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Quetta", stopOrder: 2, fareFromOrigin: 3300 },
      ],
    },
    {
      name: "Lahore - Multan - Quetta",
      stops: [
        { city: "Lahore", stopOrder: 1, fareFromOrigin: 0 },
        { city: "Multan", stopOrder: 2, fareFromOrigin: 1650 },
        { city: "Quetta", stopOrder: 3, fareFromOrigin: 4200 },
      ],
    },
  ];

  const processedRoutes = [];
  for (const rData of routesConfig) {
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
    }
    processedRoutes.push(route);
  }
  console.log(`✅ ${processedRoutes.length} nationwide routes fully configured.`);

  // 4. Batch Generate Scheduled Trips for Next 14 Days
  console.log("📅 Batch Generating trips for next 14 days...");

  const departureTimesForward = ["07:30", "11:30", "16:00", "20:30", "23:30"];
  const departureTimesReverse = ["08:30", "12:30", "17:00", "21:30", "23:59"];

  const tripsToCreate = [];
  let busIndex = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);

    for (const route of processedRoutes) {
      for (const timeStr of departureTimesForward) {
        const [h, m] = timeStr.split(":").map(Number);
        const depTime = new Date(currentDate);
        depTime.setHours(h, m, 0, 0);

        const assignedBus = allBuses[busIndex % allBuses.length];
        busIndex++;

        tripsToCreate.push({
          routeId: route.id,
          busId: assignedBus.id,
          direction: "FORWARD",
          departureTime: depTime,
          status: "SCHEDULED",
        });
      }

      for (const timeStr of departureTimesReverse) {
        const [h, m] = timeStr.split(":").map(Number);
        const depTime = new Date(currentDate);
        depTime.setHours(h, m, 0, 0);

        const assignedBus = allBuses[busIndex % allBuses.length];
        busIndex++;

        tripsToCreate.push({
          routeId: route.id,
          busId: assignedBus.id,
          direction: "REVERSE",
          departureTime: depTime,
          status: "SCHEDULED",
        });
      }
    }
  }

  console.log(`Prepared ${tripsToCreate.length} trips. Bulk inserting in chunks...`);

  // Insert in batches of 200
  const chunkSize = 200;
  for (let i = 0; i < tripsToCreate.length; i += chunkSize) {
    const chunk = tripsToCreate.slice(i, i + chunkSize);
    await prisma.trip.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Inserted batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(tripsToCreate.length / chunkSize)}`);
  }

  const totalTripsCount = await prisma.trip.count({
    where: { status: "SCHEDULED" },
  });

  console.log(`\n🎉 SUCCESS! Total Active Scheduled Trips in Database: ${totalTripsCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Error expanding routes & trips:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
