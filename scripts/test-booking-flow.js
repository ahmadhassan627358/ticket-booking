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

async function runBookingE2ETests() {
  console.log("=================================================");
  console.log("🚌 SAFAR EXPRESS - BOOKING FLOW E2E TEST SUITE");
  console.log("=================================================\n");

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
      where: {
        sessionId: {
          startsWith: "test_sess_",
        },
      },
    });

    await prisma.booking.deleteMany({
      where: {
        contactPhone: {
          in: ["0300-7654321", "0321-9876543", "+923007654321", "+923219876543", "0333-1122334"],
        },
      },
    });

    // 1. Search for trips (Lahore to Islamabad)
    console.log("--- TEST SUITE 1: Find Trip & Lock Seats ---");
    const searchRes = await makeRequest("/api/trips/search?from=Lahore&to=Islamabad&date=2026-10-05");
    assert(searchRes.status === 200, "Trip search returns 200 OK");
    assert(searchRes.body.trips && searchRes.body.trips.length > 0, `Found ${searchRes.body.trips?.length || 0} trips`);

    const trip = searchRes.body.trips[0];
    console.log(`  ℹ️ Selected Trip: ID=${trip.id}, Bus=${trip.bus.number} (${trip.bus.type})`);

    // Lock 2 Seats (Seat 7 Male, Seat 8 Female)
    const sessionId1 = `test_sess_online_${Date.now()}`;
    const lockRes1 = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: trip.id,
        fromStopId: trip.originCity.stopId,
        toStopId: trip.destinationCity.stopId,
        sessionId: sessionId1,
        seats: [
          { seatNo: 7, gender: "MALE" },
          { seatNo: 8, gender: "FEMALE" },
        ],
      },
    });

    assert(lockRes1.status === 200, "Seat locking API returns 200 OK");
    assert(lockRes1.body.success === true, "2 Seats locked successfully for 10 minutes");

    // 2. MOCK_ONLINE Payment Booking Flow
    console.log("\n--- TEST SUITE 2: MOCK_ONLINE Payment & Confirmation Flow ---");
    const onlineBookingPayload = {
      tripId: trip.id,
      fromStopId: trip.originCity.stopId,
      toStopId: trip.destinationCity.stopId,
      sessionId: sessionId1,
      contactPhone: "0300-7654321",
      contactEmail: "ali.khan@example.pk",
      paymentMethod: "MOCK_ONLINE",
      paymentMetadata: {
        cardNumber: "4242 4242 4242 4242",
        cardExpiry: "12/28",
        cardCvc: "123",
        cardHolder: "Muhammad Ali",
      },
      passengers: [
        {
          seatNo: 7,
          passengerName: "Muhammad Ali",
          cnic: "35201-1234567-1",
          gender: "MALE",
        },
        {
          seatNo: 8,
          passengerName: "Fatima Ali",
          cnic: "35201-7654321-2",
          gender: "FEMALE",
        },
      ],
    };

    const onlineBookingRes = await makeRequest("/api/bookings", {
      method: "POST",
      body: onlineBookingPayload,
    });

    assert(onlineBookingRes.status === 200, "POST /api/bookings with MOCK_ONLINE returns 200 OK");
    assert(onlineBookingRes.body.pnr && onlineBookingRes.body.pnr.length === 8, `Generated 8-char PNR: ${onlineBookingRes.body.pnr}`);
    assert(onlineBookingRes.body.status === "CONFIRMED", "Booking status is CONFIRMED");
    assert(onlineBookingRes.body.paymentStatus === "PAID", "Payment status is PAID");
    assert(onlineBookingRes.body.transactionRef?.startsWith("TXN-ONL-"), `Transaction Ref format valid: ${onlineBookingRes.body.transactionRef}`);

    const pnr1 = onlineBookingRes.body.pnr;

    // Verify Seat Locks were automatically deleted
    const remainingLocks1 = await prisma.seatLock.findMany({
      where: { sessionId: sessionId1 },
    });
    assert(remainingLocks1.length === 0, "Seat locks for sessionId1 deleted after booking completion");

    // Verify GET /api/bookings/[pnr]
    const pnrLookupRes1 = await makeRequest(`/api/bookings/${pnr1}`);
    assert(pnrLookupRes1.status === 200, "GET /api/bookings/[pnr] returns 200 OK");
    assert(pnrLookupRes1.body.booking?.pnr === pnr1, "Retrieved booking matches PNR");
    assert(pnrLookupRes1.body.booking?.seats?.length === 2, "Booking has 2 confirmed seats");
    assert(pnrLookupRes1.body.booking?.seats[0]?.cnic === "35201-1234567-1", "Passenger CNIC correctly stored and formatted");
    assert(pnrLookupRes1.body.booking?.payments?.length === 1, "Payment record attached with transaction details");

    // 3. CASH Payment Flow
    console.log("\n--- TEST SUITE 3: CASH Payment Flow (Pending 2h Expiry) ---");
    const sessionId2 = `test_sess_cash_${Date.now()}`;
    const lockRes2 = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: trip.id,
        fromStopId: trip.originCity.stopId,
        toStopId: trip.destinationCity.stopId,
        sessionId: sessionId2,
        seats: [{ seatNo: 11, gender: "MALE" }],
      },
    });

    assert(lockRes2.status === 200, "Locked seat 11 for cash booking test");

    const cashBookingPayload = {
      tripId: trip.id,
      fromStopId: trip.originCity.stopId,
      toStopId: trip.destinationCity.stopId,
      sessionId: sessionId2,
      contactPhone: "+92 321 9876543",
      contactEmail: "usman@example.com",
      paymentMethod: "CASH",
      passengers: [
        {
          seatNo: 11,
          passengerName: "Usman Tariq",
          cnic: "3520299887761", // Unhyphenated raw 13 digits, should be normalized
          gender: "MALE",
        },
      ],
    };

    const cashBookingRes = await makeRequest("/api/bookings", {
      method: "POST",
      body: cashBookingPayload,
    });

    assert(cashBookingRes.status === 200, "POST /api/bookings with CASH returns 200 OK");
    assert(cashBookingRes.body.pnr && cashBookingRes.body.pnr.length === 8, `Cash booking PNR: ${cashBookingRes.body.pnr}`);
    assert(cashBookingRes.body.status === "PENDING", "Cash booking status is PENDING");
    assert(cashBookingRes.body.paymentStatus === "UNPAID", "Cash booking payment status is UNPAID");
    assert(cashBookingRes.body.transactionRef?.startsWith("CASH-"), `Cash transaction ref: ${cashBookingRes.body.transactionRef}`);

    const pnr2 = cashBookingRes.body.pnr;

    // Verify GET /api/bookings/[pnr] for cash
    const pnrLookupRes2 = await makeRequest(`/api/bookings/${pnr2}`);
    assert(pnrLookupRes2.body.booking?.status === "PENDING", "Lookup confirms PENDING status");
    assert(pnrLookupRes2.body.booking?.paymentStatus === "UNPAID", "Lookup confirms UNPAID status");
    assert(pnrLookupRes2.body.booking?.seats[0]?.cnic === "35202-9988776-1", "Normalized raw CNIC to 35202-9988776-1");

    // 4. Failure & Retry Scenario A: Payment Gateway Decline
    console.log("\n--- TEST SUITE 4: Failure & Retry Scenarios ---");
    const sessionId3 = `test_sess_fail_${Date.now()}`;
    await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: trip.id,
        fromStopId: trip.originCity.stopId,
        toStopId: trip.destinationCity.stopId,
        sessionId: sessionId3,
        seats: [{ seatNo: 15, gender: "MALE" }],
      },
    });

    const failedPaymentPayload = {
      tripId: trip.id,
      fromStopId: trip.originCity.stopId,
      toStopId: trip.destinationCity.stopId,
      sessionId: sessionId3,
      contactPhone: "0333-1122334",
      paymentMethod: "MOCK_ONLINE",
      paymentMetadata: {
        cardNumber: "4000 0000 0000 0000", // Decline card
        forceFail: true,
      },
      passengers: [
        {
          seatNo: 15,
          passengerName: "Test Decline Passenger",
          cnic: "35201-1111111-1",
          gender: "MALE",
        },
      ],
    };

    const failRes = await makeRequest("/api/bookings", {
      method: "POST",
      body: failedPaymentPayload,
    });

    assert(failRes.status === 402, "Payment failure returns 402 Payment Required status code");
    assert(failRes.body.code === "PAYMENT_FAILED", "Error code is PAYMENT_FAILED");
    assert(failRes.body.error.includes("declined") || failRes.body.error.includes("failure"), "Clear error message returned for payment decline");

    // Verify seat locks STILL EXIST so user can retry payment without losing seat hold
    const remainingLocksAfterFail = await prisma.seatLock.findMany({
      where: { sessionId: sessionId3 },
    });
    assert(remainingLocksAfterFail.length === 1, "Seat lock preserved during payment failure for retry");

    // Test 4B: Expired or unheld seat lock verification
    const invalidLockPayload = {
      tripId: trip.id,
      fromStopId: trip.originCity.stopId,
      toStopId: trip.destinationCity.stopId,
      sessionId: "completely_invalid_session_xyz",
      contactPhone: "0300-1234567",
      paymentMethod: "CASH",
      passengers: [
        {
          seatNo: 20,
          passengerName: "No Lock Passenger",
          cnic: "35201-2222222-2",
          gender: "MALE",
        },
      ],
    };

    const invalidLockRes = await makeRequest("/api/bookings", {
      method: "POST",
      body: invalidLockPayload,
    });

    assert(invalidLockRes.status === 410, "Attempt to book without valid session lock returns 410 Gone / Expired");
    assert(invalidLockRes.body.code === "LOCKS_EXPIRED", "Error code is LOCKS_EXPIRED with friendly user instruction");

    // Clean up test lock
    await prisma.seatLock.deleteMany({ where: { sessionId: sessionId3 } });

    console.log("\n=================================================");
    console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("=================================================\n");

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBookingE2ETests();
