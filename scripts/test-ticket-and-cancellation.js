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

async function runCancellationTests() {
  console.log("==================================================================");
  console.log("🎫 SAFAR EXPRESS - TICKET PDF & CANCELLATION REFUND TEST SUITE");
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
    // 0. Clean up previous test runs
    await prisma.seatLock.deleteMany({
      where: { sessionId: { startsWith: "test_cxl_" } },
    });
    await prisma.booking.deleteMany({
      where: { contactPhone: { in: ["0300-8888888", "0311-9999999", "0322-7777777", "0344-6666666"] } },
    });

    const route = await prisma.route.findFirst({
      include: { stops: { include: { city: true }, orderBy: { stopOrder: "asc" } } },
    });
    const bus = await prisma.bus.findFirst();
    const fromStop = route.stops[0];
    const toStop = route.stops[route.stops.length - 1];
    const fare = Math.abs(fromStop.fareFromOrigin - toStop.fareFromOrigin);

    const now = new Date();

    // Helper to create test trip at specific hours offset
    async function createTestTrip(hoursFromNow) {
      const departureTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
      return await prisma.trip.create({
        data: {
          routeId: route.id,
          busId: bus.id,
          direction: "FORWARD",
          departureTime,
          status: "SCHEDULED",
        },
      });
    }

    // Helper to create test booking
    async function createTestBooking(tripId, seatNo, phone, paymentMethod = "MOCK_ONLINE", isConfirmed = true) {
      const pnr = `TCK${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return await prisma.booking.create({
        data: {
          pnr,
          tripId,
          totalAmount: fare,
          status: isConfirmed ? "CONFIRMED" : "PENDING",
          paymentStatus: isConfirmed ? "PAID" : "UNPAID",
          contactPhone: phone,
          seats: {
            create: {
              tripId,
              seatNo,
              passengerName: "Hamza Ahmed",
              cnic: "35201-1234567-1",
              gender: "MALE",
              fromStopId: fromStop.id,
              toStopId: toStop.id,
              fare,
            },
          },
          payments: {
            create: {
              method: paymentMethod,
              amount: fare,
              status: isConfirmed ? "SUCCESS" : "PENDING",
              transactionRef: `TXN-${pnr}`,
            },
          },
        },
        include: { seats: true, trip: true },
      });
    }

    // -------------------------------------------------------------
    // TEST 1: E-Ticket PDF Generation & Confirmation Guard
    // -------------------------------------------------------------
    console.log("--- TEST 1: E-Ticket PDF Generation & QR Code ---");
    const tripForPdf = await createTestTrip(36);
    const confirmedBooking = await createTestBooking(tripForPdf.id, 5, "0300-8888888", "MOCK_ONLINE", true);
    const pendingBooking = await createTestBooking(tripForPdf.id, 6, "0300-8888888", "CASH", false);

    // PDF on Confirmed Booking
    const pdfRes = await makeRequest(`/api/bookings/${confirmedBooking.pnr}/ticket`);
    assert(pdfRes.status === 200, "GET /api/bookings/[pnr]/ticket returns 200 OK for CONFIRMED booking");
    assert(pdfRes.headers["content-type"] === "application/pdf", "Content-Type header is application/pdf");
    assert(pdfRes.raw.slice(0, 4).toString() === "%PDF", "Response starts with valid %PDF magic bytes");
    assert(pdfRes.raw.length > 500, `PDF generated with QR code (Size: ${pdfRes.raw.length} bytes)`);

    // PDF on Pending Booking should be blocked
    const pendingPdfRes = await makeRequest(`/api/bookings/${pendingBooking.pnr}/ticket`);
    assert(pendingPdfRes.status === 400, "GET /api/bookings/[pnr]/ticket returns 400 Bad Request for PENDING booking");
    assert(pendingPdfRes.body.error?.includes("CONFIRMED"), "Error explains PDF is only available for CONFIRMED bookings");

    // -------------------------------------------------------------
    // TEST 2: Public Track API (PNR + Phone Lookup)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Public Ticket Tracking API ---");
    const trackRes = await makeRequest("/api/bookings/track", {
      method: "POST",
      body: { pnr: confirmedBooking.pnr, phone: "0300-8888888" },
    });
    assert(trackRes.status === 200, "POST /api/bookings/track returns 200 OK with valid PNR & phone");
    assert(trackRes.body.booking?.pnr === confirmedBooking.pnr, "Tracked booking matches PNR");
    assert(trackRes.body.booking?.seats?.length === 1, "Tracked booking returns seat details");

    const trackFailRes = await makeRequest("/api/bookings/track", {
      method: "POST",
      body: { pnr: confirmedBooking.pnr, phone: "0300-0000000" }, // Wrong phone
    });
    assert(trackFailRes.status === 404, "POST /api/bookings/track returns 404 for mismatched phone number");

    // -------------------------------------------------------------
    // TEST 3: Cancellation Window 1 (> 24 Hours -> 100% Refund)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Cancellation Window 1 (> 24 Hours -> 100% Refund) ---");
    const tripWindow1 = await createTestTrip(36); // 36 hours from now
    const bookingWindow1 = await createTestBooking(tripWindow1.id, 9, "0311-9999999", "MOCK_ONLINE", true);

    // Preview
    const preview1 = await makeRequest(`/api/bookings/${bookingWindow1.pnr}/cancel`);
    assert(preview1.status === 200, "GET /api/bookings/[pnr]/cancel preview returns 200 OK");
    assert(preview1.body.refundPercentage === 100, `Refund percentage is 100% (>24h window)`);
    assert(preview1.body.refundAmount === fare, `Full refund amount of Rs. ${fare} calculated`);

    // Execute Cancellation
    const cancelRes1 = await makeRequest(`/api/bookings/${bookingWindow1.pnr}/cancel`, { method: "POST" });
    assert(cancelRes1.status === 200, "POST /api/bookings/[pnr]/cancel returns 200 OK");
    assert(cancelRes1.body.status === "CANCELLED", "Booking status updated to CANCELLED");
    assert(cancelRes1.body.paymentStatus === "REFUNDED", "Payment status updated to REFUNDED");
    assert(cancelRes1.body.refundAmount === fare, "Refund amount matched 100%");

    // Verify seat 9 was freed up
    const remainingSeats1 = await prisma.bookingSeat.findMany({ where: { bookingId: bookingWindow1.id } });
    assert(remainingSeats1.length === 0, "Booking seats released from database on cancellation");

    // -------------------------------------------------------------
    // TEST 4: Cancellation Window 2 (6h to 24h -> 75% Refund)
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Cancellation Window 2 (6h to 24h -> 75% Refund) ---");
    const tripWindow2 = await createTestTrip(12); // 12 hours from now
    const bookingWindow2 = await createTestBooking(tripWindow2.id, 14, "0322-7777777", "MOCK_ONLINE", true);

    const preview2 = await makeRequest(`/api/bookings/${bookingWindow2.pnr}/cancel`);
    assert(preview2.body.refundPercentage === 75, `Refund percentage is 75% for 12h window`);
    assert(preview2.body.refundAmount === Math.round(fare * 0.75), `75% refund amount calculated accurately (Rs. ${preview2.body.refundAmount})`);

    const cancelRes2 = await makeRequest(`/api/bookings/${bookingWindow2.pnr}/cancel`, { method: "POST" });
    assert(cancelRes2.status === 200, "Cancelled 12h booking successfully with 75% refund");
    assert(cancelRes2.body.refundPercentage === 75, "75% refund recorded in cancellation response");

    // -------------------------------------------------------------
    // TEST 5: Cancellation Window 3 (< 6 Hours -> 50% Refund)
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Cancellation Window 3 (< 6 Hours -> 50% Refund) ---");
    const tripWindow3 = await createTestTrip(3); // 3 hours from now
    const bookingWindow3 = await createTestBooking(tripWindow3.id, 18, "0344-6666666", "MOCK_ONLINE", true);

    const preview3 = await makeRequest(`/api/bookings/${bookingWindow3.pnr}/cancel`);
    assert(preview3.body.refundPercentage === 50, `Refund percentage is 50% for 3h window`);
    assert(preview3.body.refundAmount === Math.round(fare * 0.5), `50% refund amount calculated accurately (Rs. ${preview3.body.refundAmount})`);

    const cancelRes3 = await makeRequest(`/api/bookings/${bookingWindow3.pnr}/cancel`, { method: "POST" });
    assert(cancelRes3.status === 200, "Cancelled 3h booking successfully with 50% refund");
    assert(cancelRes3.body.refundPercentage === 50, "50% refund recorded in cancellation response");

    // -------------------------------------------------------------
    // TEST 6: Past Departure (Cancellation Not Allowed)
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Past Departure Cancellation Guard ---");
    const tripWindow4 = await createTestTrip(-2); // 2 hours ago (past trip)
    const bookingWindow4 = await createTestBooking(tripWindow4.id, 22, "0300-8888888", "MOCK_ONLINE", true);

    const cancelRes4 = await makeRequest(`/api/bookings/${bookingWindow4.pnr}/cancel`, { method: "POST" });
    assert(cancelRes4.status === 400, "Cancellation after departure rejected with 400 Bad Request");
    assert(cancelRes4.body.error?.includes("departure"), "Error message clarifies cancellation not allowed after departure");

    // Clean up test bookings and trips
    const testTripIds = [tripForPdf.id, tripWindow1.id, tripWindow2.id, tripWindow3.id, tripWindow4.id];
    await prisma.bookingSeat.deleteMany({ where: { tripId: { in: testTripIds } } });
    await prisma.payment.deleteMany({ where: { booking: { tripId: { in: testTripIds } } } });
    await prisma.booking.deleteMany({ where: { tripId: { in: testTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: testTripIds } } });

    console.log("\n==================================================================");
    console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
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

runCancellationTests();
