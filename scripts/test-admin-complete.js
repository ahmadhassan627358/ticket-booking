const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";

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
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            try {
              resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(buffer.toString()), raw: buffer });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, body: buffer.toString(), raw: buffer });
            }
          } else {
            resolve({ status: res.statusCode, headers: res.headers, body: buffer.toString(), raw: buffer });
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

async function runCompleteAdminTests() {
  console.log("==================================================================");
  console.log("🛠️  SAFAR EXPRESS - COMPLETE ADMIN PANEL & ANALYTICS TEST SUITE");
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
    // SETUP: Clean test records and prepare test trips & bookings
    // -------------------------------------------------------------
    console.log("--- STEP 0: Setup & Customer Booking Flow Simulation ---");
    
    // Clean up test bookings
    await prisma.payment.deleteMany({
      where: { booking: { pnr: { startsWith: "TESTADM" } } },
    });
    await prisma.bookingSeat.deleteMany({
      where: { booking: { pnr: { startsWith: "TESTADM" } } },
    });
    await prisma.booking.deleteMany({
      where: { pnr: { startsWith: "TESTADM" } },
    });

    const route = await prisma.route.findFirst({
      include: { stops: { include: { city: true }, orderBy: { stopOrder: "asc" } } },
    });
    const bus = await prisma.bus.findFirst();
    const fromStop = route.stops[0];
    const toStop = route.stops[route.stops.length - 1];
    const fare = Math.abs(fromStop.fareFromOrigin - toStop.fareFromOrigin);

    // Create a trip for today (earliest today so it's in nextUpcomingTrips)
    const todayTripTime = new Date();
    todayTripTime.setHours(0, 1, 0, 0);

    const testTripToday = await prisma.trip.create({
      data: {
        routeId: route.id,
        busId: bus.id,
        direction: "FORWARD",
        departureTime: todayTripTime,
        status: "SCHEDULED",
      },
    });

    // Create Booking 1: Online paid booking
    const booking1 = await prisma.booking.create({
      data: {
        pnr: "TESTADM1",
        tripId: testTripToday.id,
        totalAmount: fare * 2,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        contactPhone: "0300-1111111",
        seats: {
          create: [
            {
              tripId: testTripToday.id,
              seatNo: 1,
              passengerName: "Zainab Bibi",
              cnic: "35201-1111111-2",
              gender: "FEMALE",
              fromStopId: fromStop.id,
              toStopId: toStop.id,
              fare: fare,
            },
            {
              tripId: testTripToday.id,
              seatNo: 2,
              passengerName: "Tariq Mahmood",
              cnic: "35201-2222222-3",
              gender: "MALE",
              fromStopId: fromStop.id,
              toStopId: toStop.id,
              fare: fare,
            },
          ],
        },
        payments: {
          create: {
            method: "MOCK_ONLINE",
            amount: fare * 2,
            status: "SUCCESS",
            transactionRef: "TXN-TESTADM1",
          },
        },
      },
    });

    // Create Booking 2: Cash Unpaid booking (to test confirm payment button)
    const booking2 = await prisma.booking.create({
      data: {
        pnr: "TESTADM2",
        tripId: testTripToday.id,
        totalAmount: fare,
        status: "PENDING",
        paymentStatus: "UNPAID",
        contactPhone: "0321-9999888",
        seats: {
          create: {
            tripId: testTripToday.id,
            seatNo: 3,
            passengerName: "Bilal Ahmad",
            cnic: "35201-3333333-4",
            gender: "MALE",
            fromStopId: fromStop.id,
            toStopId: toStop.id,
            fare: fare,
          },
        },
        payments: {
          create: {
            method: "CASH",
            amount: fare,
            status: "PENDING",
            transactionRef: null,
          },
        },
      },
    });

    // Create Booking 3: Paid booking to test cancel with refund
    const booking3 = await prisma.booking.create({
      data: {
        pnr: "TESTADM3",
        tripId: testTripToday.id,
        totalAmount: fare,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        contactPhone: "0333-7777666",
        seats: {
          create: {
            tripId: testTripToday.id,
            seatNo: 4,
            passengerName: "Ayesha Tariq",
            cnic: "35201-4444444-5",
            gender: "FEMALE",
            fromStopId: fromStop.id,
            toStopId: toStop.id,
            fare: fare,
          },
        },
        payments: {
          create: {
            method: "MOCK_ONLINE",
            amount: fare,
            status: "SUCCESS",
            transactionRef: "TXN-TESTADM3",
          },
        },
      },
    });

    console.log("  ✅ Seeded test trip and 3 customer bookings (TESTADM1, TESTADM2, TESTADM3).");

    // -------------------------------------------------------------
    // TEST 1: Dashboard API Metrics, Chart & Upcoming Trips
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Admin Dashboard API ---");
    const dashRes = await makeRequest("/api/admin/dashboard");
    assert(dashRes.status === 200, "GET /api/admin/dashboard returns 200 OK");
    assert(dashRes.body.stats !== undefined, "Dashboard returns stats object");
    assert(typeof dashRes.body.stats.todayBookings === "number", "Today bookings metric is returned");
    assert(typeof dashRes.body.stats.todayRevenue === "number", "Today revenue metric is returned");
    assert(typeof dashRes.body.stats.seatsSold === "number", "Seats sold metric is returned");
    assert(typeof dashRes.body.stats.activeTrips === "number", "Active trips metric is returned");
    assert(typeof dashRes.body.stats.avgOccupancy === "number", "Average occupancy % metric is returned");
    
    // Check 7 Days sales chart data
    assert(Array.isArray(dashRes.body.last7DaysSales), "Dashboard returns last7DaysSales array");
    assert(dashRes.body.last7DaysSales.length === 7, "Last 7 days sales has exactly 7 daily entries");
    assert(dashRes.body.last7DaysSales[6].revenue >= fare * 2, "Latest day in chart includes today's revenue");

    // Check next 10 upcoming trips
    assert(Array.isArray(dashRes.body.nextUpcomingTrips), "Dashboard returns nextUpcomingTrips array");
    assert(dashRes.body.nextUpcomingTrips.length <= 10, "Upcoming trips capped at 10");
    const foundTestTrip = dashRes.body.nextUpcomingTrips.find((t) => t.id === testTripToday.id);
    assert(foundTestTrip !== undefined, "Test trip included in upcoming trips list");
    assert(foundTestTrip?.bookedSeatsCount >= 4, "Upcoming trip reports correct booked seats count (occupancy calculation)");

    // -------------------------------------------------------------
    // TEST 2: Bookings Management API (Search, Filter, Details)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Bookings Management API & Filters ---");
    
    // 2A: Search by PNR
    const searchPnrRes = await makeRequest("/api/admin/bookings?search=TESTADM1");
    assert(searchPnrRes.status === 200, "GET /api/admin/bookings?search=TESTADM1 returns 200 OK");
    assert(searchPnrRes.body.bookings?.length >= 1, "Found booking by PNR search");
    assert(searchPnrRes.body.bookings[0]?.pnr === "TESTADM1", "Booking PNR matches search");

    // 2B: Search by Passenger Name
    const searchNameRes = await makeRequest("/api/admin/bookings?search=Zainab");
    assert(searchNameRes.status === 200, "GET /api/admin/bookings?search=Zainab returns 200 OK");
    assert(searchNameRes.body.bookings?.some((b) => b.pnr === "TESTADM1"), "Search by passenger name matched booking");

    // 2C: Search by Phone
    const searchPhoneRes = await makeRequest("/api/admin/bookings?search=0321-9999888");
    assert(searchPhoneRes.status === 200, "GET /api/admin/bookings?search=0321-9999888 returns 200 OK");
    assert(searchPhoneRes.body.bookings?.some((b) => b.pnr === "TESTADM2"), "Search by contact phone matched booking");

    // 2D: Filter by Status
    const filterStatusRes = await makeRequest("/api/admin/bookings?status=PENDING");
    assert(filterStatusRes.status === 200, "GET /api/admin/bookings?status=PENDING returns 200 OK");
    assert(filterStatusRes.body.bookings?.every((b) => b.status === "PENDING"), "All filtered bookings have status PENDING");

    // 2E: Filter by Route
    const filterRouteRes = await makeRequest(`/api/admin/bookings?routeId=${route.id}`);
    assert(filterRouteRes.status === 200, "GET /api/admin/bookings?routeId=... returns 200 OK");

    // 2F: Single Booking Details
    const singleBookingRes = await makeRequest(`/api/admin/bookings/${booking1.id}`);
    assert(singleBookingRes.status === 200, "GET /api/admin/bookings/[id] returns 200 OK");
    assert(singleBookingRes.body.booking?.pnr === "TESTADM1", "Single booking details returned with correct PNR");
    assert(singleBookingRes.body.booking?.seats?.length === 2, "Single booking returned seat manifest");

    // -------------------------------------------------------------
    // TEST 3: Confirm CASH Booking as Paid Button
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Confirm Cash Booking as Paid ---");
    const confirmCashRes = await makeRequest(`/api/admin/bookings/${booking2.id}/confirm-payment`, {
      method: "POST",
    });
    assert(confirmCashRes.status === 200, "POST /api/admin/bookings/[id]/confirm-payment returns 200 OK");
    assert(confirmCashRes.body.booking?.status === "CONFIRMED", "Booking status transitioned to CONFIRMED");
    assert(confirmCashRes.body.booking?.paymentStatus === "PAID", "Booking paymentStatus transitioned to PAID");

    // Verify in database
    const dbBooking2 = await prisma.booking.findUnique({
      where: { id: booking2.id },
      include: { payments: true },
    });
    assert(dbBooking2.status === "CONFIRMED", "DB confirms booking status is CONFIRMED");
    assert(dbBooking2.paymentStatus === "PAID", "DB confirms paymentStatus is PAID");
    assert(dbBooking2.payments[0]?.status === "SUCCESS", "DB confirms payment record status is SUCCESS");

    // -------------------------------------------------------------
    // TEST 4: Cancel Booking with Refund Button
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Cancel Booking with Refund ---");
    const cancelRes = await makeRequest(`/api/admin/bookings/${booking3.id}/cancel`, {
      method: "POST",
      body: { fullRefund: true },
    });
    assert(cancelRes.status === 200, "POST /api/admin/bookings/[id]/cancel returns 200 OK");
    assert(cancelRes.body.status === "CANCELLED", "Booking status updated to CANCELLED");
    assert(cancelRes.body.paymentStatus === "REFUNDED", "Payment status updated to REFUNDED");
    assert(cancelRes.body.refundAmount === fare, `Refund amount matches ticket fare (Rs. ${fare})`);

    // Verify seats were released
    const releasedSeats = await prisma.bookingSeat.findMany({
      where: { bookingId: booking3.id },
    });
    assert(releasedSeats.length === 0, "Booking seats released from database immediately");

    // -------------------------------------------------------------
    // TEST 5: Reports API (Per-Route Breakdown & Time Series)
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Reports Page API (Daily / Weekly & Route Breakdown) ---");
    
    // 5A: Daily Reports
    const todayStr = new Date().toISOString().split("T")[0];
    const reportDailyRes = await makeRequest(`/api/admin/reports?startDate=${todayStr}&endDate=${todayStr}&groupBy=day`);
    assert(reportDailyRes.status === 200, "GET /api/admin/reports (Daily) returns 200 OK");
    assert(reportDailyRes.body.summary !== undefined, "Report returns summary KPIs");
    assert(reportDailyRes.body.summary.totalRevenue > 0, "Report calculates net revenue");
    assert(reportDailyRes.body.summary.cancellationsCount >= 1, "Report tracks cancelled bookings count");
    assert(reportDailyRes.body.summary.totalRefunds >= fare, "Report tracks refunded amounts");
    assert(Array.isArray(reportDailyRes.body.routeBreakdown), "Report returns routeBreakdown array");
    assert(reportDailyRes.body.routeBreakdown.length > 0, "Route breakdown contains configured routes");
    assert(typeof reportDailyRes.body.routeBreakdown[0].occupancyRate === "number", "Route reports capacity occupancy rate");

    // 5B: Weekly Reports
    const reportWeeklyRes = await makeRequest(`/api/admin/reports?startDate=${todayStr}&endDate=${todayStr}&groupBy=week`);
    assert(reportWeeklyRes.status === 200, "GET /api/admin/reports (Weekly) returns 200 OK");
    assert(Array.isArray(reportWeeklyRes.body.timeSeries), "Weekly report returns timeSeries array");

    // -------------------------------------------------------------
    // TEST 6: Export to CSV
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Export Reports to CSV ---");
    const csvRes = await makeRequest(`/api/admin/reports?startDate=${todayStr}&endDate=${todayStr}&groupBy=day&format=csv`);
    assert(csvRes.status === 200, "GET /api/admin/reports?format=csv returns 200 OK");
    assert(csvRes.headers["content-type"]?.includes("text/csv"), "Content-Type is text/csv");
    assert(csvRes.headers["content-disposition"]?.includes("attachment"), "Content-Disposition specifies attachment download");
    assert(csvRes.body.includes("Safar Express - Business Sales & Performance Report"), "CSV contains report title header");
    assert(csvRes.body.includes("ROUTE SALES PERFORMANCE BREAKDOWN"), "CSV contains route breakdown table");
    assert(csvRes.body.includes("TIME SERIES SALES"), "CSV contains time series breakdown table");

    // Clean up test data
    await prisma.payment.deleteMany({
      where: { booking: { pnr: { in: ["TESTADM1", "TESTADM2", "TESTADM3"] } } },
    });
    await prisma.bookingSeat.deleteMany({
      where: { booking: { pnr: { in: ["TESTADM1", "TESTADM2", "TESTADM3"] } } },
    });
    await prisma.booking.deleteMany({
      where: { pnr: { in: ["TESTADM1", "TESTADM2", "TESTADM3"] } },
    });
    await prisma.trip.delete({ where: { id: testTripToday.id } });

    console.log("\n==================================================================");
    console.log(`🏁 COMPLETE ADMIN TEST SUITE: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("==================================================================\n");

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCompleteAdminTests();
