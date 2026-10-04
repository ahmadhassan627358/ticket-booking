const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";

// Admin user session simulation (or direct API call with seeded admin or token)
async function makeRequest(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "safar-admin-secret-2026",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed, raw: data });
          } catch {
            resolve({ status: res.statusCode, body: data, raw: data });
          }
        });
      }
    );

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runAdminTests() {
  console.log("==================================================================");
  console.log("🛠️  SAFAR EXPRESS - ADMIN PANEL & BULK GENERATOR TEST SUITE");
  console.log("==================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Cities Management (CRUD + Deletion Guard)
    // -------------------------------------------------------------
    console.log("--- TEST 1: Cities CRUD & Deletion Guard ---");
    
    // Clean up test city if existing
    await prisma.city.deleteMany({ where: { name: { in: ["Test Gwadar", "Test Gwadar Port"] } } });

    // 1A: Create City
    const createCityRes = await makeRequest("/api/admin/cities", {
      method: "POST",
      body: { name: "Test Gwadar" },
    });
    assert(createCityRes.status === 200, "POST /api/admin/cities creates new city (200 OK)");
    assert(createCityRes.body.city?.name === "Test Gwadar", "Created city name matches");
    const testCityId = createCityRes.body.city?.id;

    // 1B: Edit City
    const editCityRes = await makeRequest(`/api/admin/cities/${testCityId}`, {
      method: "PUT",
      body: { name: "Test Gwadar Port" },
    });
    assert(editCityRes.status === 200, "PUT /api/admin/cities/[id] renames city (200 OK)");
    assert(editCityRes.body.city?.name === "Test Gwadar Port", "Renamed city verified");

    // 1C: Attempt Deletion of City used in Route (Lahore)
    const lahoreCity = await prisma.city.findFirst({ where: { name: "Lahore" } });
    const deleteLahoreRes = await makeRequest(`/api/admin/cities/${lahoreCity.id}`, {
      method: "DELETE",
    });
    assert(deleteLahoreRes.status === 400, "DELETE on city used in active routes is BLOCKED (400 Bad Request)");
    assert(deleteLahoreRes.body.error?.includes("active route"), "Error message clarifies city is part of active routes");

    // 1D: Delete Unused City
    const deleteCityRes = await makeRequest(`/api/admin/cities/${testCityId}`, {
      method: "DELETE",
    });
    assert(deleteCityRes.status === 200, "DELETE on unused city succeeds (200 OK)");

    // -------------------------------------------------------------
    // TEST 2: Routes CRUD & Ordered Stops Reordering
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Routes CRUD & Stops Reordering ---");
    const cities = await prisma.city.findMany({ take: 3 });

    // 2A: Create Route
    const createRouteRes = await makeRequest("/api/admin/routes", {
      method: "POST",
      body: {
        name: "Test Express Corridor",
        stops: [
          { cityId: cities[0].id, stopOrder: 1, fareFromOrigin: 0 },
          { cityId: cities[1].id, stopOrder: 2, fareFromOrigin: 800 },
          { cityId: cities[2].id, stopOrder: 3, fareFromOrigin: 1600 },
        ],
      },
    });
    assert(createRouteRes.status === 200, "POST /api/admin/routes creates route with 3 stops (200 OK)");
    const testRouteId = createRouteRes.body.route?.id;

    // 2B: Edit Route & Reorder Stops
    const editRouteRes = await makeRequest(`/api/admin/routes/${testRouteId}`, {
      method: "PUT",
      body: {
        name: "Test Express Corridor Updated",
        stops: [
          { cityId: cities[2].id, stopOrder: 1, fareFromOrigin: 0 },
          { cityId: cities[1].id, stopOrder: 2, fareFromOrigin: 900 },
          { cityId: cities[0].id, stopOrder: 3, fareFromOrigin: 1800 },
        ],
      },
    });
    assert(editRouteRes.status === 200, "PUT /api/admin/routes/[id] reorders stops (200 OK)");
    assert(editRouteRes.body.route?.stops[0]?.cityId === cities[2].id, "First stop successfully reordered to city 2");

    // -------------------------------------------------------------
    // TEST 3: Buses Fleet CRUD
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Buses Fleet CRUD ---");
    await prisma.bus.deleteMany({ where: { number: "BUS-TEST-99" } });

    // 3A: Create Bus
    const createBusRes = await makeRequest("/api/admin/buses", {
      method: "POST",
      body: {
        number: "BUS-TEST-99",
        type: "BUSINESS",
        layout: "2x1",
        totalSeats: 33,
      },
    });
    assert(createBusRes.status === 200, "POST /api/admin/buses adds bus to fleet (200 OK)");
    const testBusId = createBusRes.body.bus?.id;

    // 3B: Edit Bus
    const editBusRes = await makeRequest(`/api/admin/buses/${testBusId}`, {
      method: "PUT",
      body: {
        number: "BUS-TEST-99",
        type: "EXECUTIVE",
        layout: "2x2",
        totalSeats: 44,
      },
    });
    assert(editBusRes.status === 200, "PUT /api/admin/buses/[id] updates bus specs (200 OK)");
    assert(editBusRes.body.bus?.totalSeats === 44, "Bus capacity updated to 44");

    // -------------------------------------------------------------
    // TEST 4: Single Trip Creation & Bulk Schedule Generator
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Trips Creation & Bulk Schedule Generator ---");

    // 4A: Single Trip Creation
    const singleTripRes = await makeRequest("/api/admin/trips", {
      method: "POST",
      body: {
        routeId: testRouteId,
        busId: testBusId,
        direction: "FORWARD",
        departureTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
    });
    assert(singleTripRes.status === 200, "POST /api/admin/trips creates single scheduled trip (200 OK)");
    const singleTripId = singleTripRes.body.trip?.id;

    // 4B: Bulk Trip Generator (3 days x 2 time slots x BOTH directions = 12 trips)
    const startDate = "2026-11-01";
    const endDate = "2026-11-03"; // 3 days (Nov 1, 2, 3)
    const timeSlots = ["09:00", "17:00"]; // 2 slots

    const bulkRes = await makeRequest("/api/admin/trips/bulk", {
      method: "POST",
      body: {
        routeId: testRouteId,
        busId: testBusId,
        direction: "BOTH", // 2 directions
        startDate,
        endDate,
        timeSlots,
      },
    });

    assert(bulkRes.status === 200, "POST /api/admin/trips/bulk generates recurring trips (200 OK)");
    assert(bulkRes.body.count === 12, `Generated exactly 12 trips (3 days x 2 slots x 2 directions = ${bulkRes.body.count})`);

    // -------------------------------------------------------------
    // TEST 5: Trip Cancellation with 100% Full Refund & Seat Release
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Trip Cancellation with Automated 100% Refund ---");

    // Create a booking on singleTripId
    const routeObj = await prisma.route.findUnique({
      where: { id: testRouteId },
      include: { stops: { orderBy: { stopOrder: "asc" } } },
    });

    const testPnr = "CXLTRIP1";
    await prisma.booking.create({
      data: {
        pnr: testPnr,
        tripId: singleTripId,
        totalAmount: 1800,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        contactPhone: "0300-5555555",
        seats: {
          create: {
            tripId: singleTripId,
            seatNo: 3,
            passengerName: "Admin Test Passenger",
            cnic: "35201-1111111-1",
            gender: "MALE",
            fromStopId: routeObj.stops[0].id,
            toStopId: routeObj.stops[2].id,
            fare: 1800,
          },
        },
        payments: {
          create: {
            method: "MOCK_ONLINE",
            amount: 1800,
            status: "SUCCESS",
            transactionRef: "TXN-CXLTRIP1",
          },
        },
      },
    });

    // Execute Trip Cancellation via Admin API
    const cancelTripRes = await makeRequest(`/api/admin/trips/${singleTripId}/cancel`, {
      method: "POST",
    });

    assert(cancelTripRes.status === 200, "POST /api/admin/trips/[id]/cancel returns 200 OK");
    assert(cancelTripRes.body.cancelledBookingsCount === 1, "Trip cancellation reports 1 booking affected");
    assert(cancelTripRes.body.totalRefundAmount === 1800, "Full 100% refund of Rs. 1800 issued to booking");

    // Verify in DB that booking status is CANCELLED and paymentStatus is REFUNDED
    const cancelledBooking = await prisma.booking.findUnique({ where: { pnr: testPnr } });
    assert(cancelledBooking.status === "CANCELLED", "Booking marked as CANCELLED in database");
    assert(cancelledBooking.paymentStatus === "REFUNDED", "Booking paymentStatus updated to REFUNDED");

    // Verify seats were released
    const remainingSeats = await prisma.bookingSeat.findMany({ where: { tripId: singleTripId } });
    assert(remainingSeats.length === 0, "All seats released from trip");

    // Clean up test data
    await prisma.payment.deleteMany({ where: { booking: { pnr: testPnr } } });
    await prisma.booking.deleteMany({ where: { pnr: testPnr } });
    await prisma.trip.deleteMany({ where: { routeId: testRouteId } });
    await prisma.route.delete({ where: { id: testRouteId } });
    await prisma.bus.delete({ where: { id: testBusId } });

    console.log("\n==================================================================");
    console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("==================================================================\n");

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAdminTests();
