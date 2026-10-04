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

// Pure helper function for Adjacent Seat calculation mirroring busLayout.ts
function getAdjacentSeatNo(seatNo, layout) {
  if (layout === "2x2") {
    const remainder = seatNo % 4;
    if (remainder === 1) return seatNo + 1;
    if (remainder === 2) return seatNo - 1;
    if (remainder === 3) return seatNo + 1;
    if (remainder === 0) return seatNo - 1;
  }
  if (layout === "2x1") {
    const remainder = seatNo % 3;
    if (remainder === 1) return seatNo + 1;
    if (remainder === 2) return seatNo - 1;
    if (remainder === 0) return null; // Solo single seat
  }
  return null;
}

// Pure helper function for Refund Policy mirroring refundPolicy.ts
function calculateRefundPolicy(departureTime, totalAmount, paymentStatus = "PAID", cancellationTime = new Date()) {
  const depTime = new Date(departureTime).getTime();
  const cancelTime = new Date(cancellationTime).getTime();
  const diffMs = depTime - cancelTime;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return {
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      refundPercentage: 0,
      refundAmount: 0,
      isAllowed: false,
    };
  }

  let refundPercentage = 0;
  if (hoursRemaining > 24) {
    refundPercentage = 100;
  } else if (hoursRemaining >= 6) {
    refundPercentage = 75;
  } else {
    refundPercentage = 50;
  }

  const isPaid = paymentStatus === "PAID";
  const refundAmount = isPaid ? Math.round((totalAmount * refundPercentage) / 100) : 0;

  return {
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    refundPercentage,
    refundAmount,
    isAllowed: true,
  };
}

async function runCoreBusinessLogicTests() {
  console.log("==================================================================");
  console.log("🧪 SAFAR EXPRESS - CORE DOMAIN & BUSINESS LOGIC TEST SUITE");
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
    // Clean up test data
    await prisma.seatLock.deleteMany({ where: { sessionId: { startsWith: "cbl_test_" } } });
    await prisma.bookingSeat.deleteMany({ where: { booking: { pnr: { startsWith: "CBL" } } } });
    await prisma.payment.deleteMany({ where: { booking: { pnr: { startsWith: "CBL" } } } });
    await prisma.booking.deleteMany({ where: { pnr: { startsWith: "CBL" } } });
    await prisma.trip.deleteMany({ where: { status: "CBL_TEST" } });

    // -------------------------------------------------------------
    // TEST SUITE 1: FARE CALCULATION & SEGMENT MATHEMATICS
    // -------------------------------------------------------------
    console.log("--- TEST 1: Fare Calculation & Intermediate Segments ---");
    
    // Fetch 4-stop corridor (Lahore -> Multan -> Sukkur -> Karachi)
    const longRoute = await prisma.route.findFirst({
      where: { name: { contains: "Karachi" } },
      include: { stops: { include: { city: true }, orderBy: { stopOrder: "asc" } } },
    });

    const lahoreStop = longRoute.stops.find((s) => s.city.name === "Lahore");
    const multanStop = longRoute.stops.find((s) => s.city.name === "Multan");
    const sukkurStop = longRoute.stops.find((s) => s.city.name === "Sukkur");
    const karachiStop = longRoute.stops.find((s) => s.city.name === "Karachi");

    // 1A: Origin to Final Destination
    const fullFare = Math.abs(lahoreStop.fareFromOrigin - karachiStop.fareFromOrigin);
    assert(fullFare === 4800, `Full corridor fare (Lahore -> Karachi) is Rs. 4800 (Calculated: ${fullFare})`);

    // 1B: Origin to Intermediate Stop
    const lahoreToMultanFare = Math.abs(lahoreStop.fareFromOrigin - multanStop.fareFromOrigin);
    assert(lahoreToMultanFare === 1500, `Segment fare (Lahore -> Multan) is Rs. 1500 (Calculated: ${lahoreToMultanFare})`);

    // 1C: Intermediate to Intermediate Stop
    const multanToSukkurFare = Math.abs(multanStop.fareFromOrigin - sukkurStop.fareFromOrigin);
    assert(multanToSukkurFare === 1700, `Segment fare (Multan -> Sukkur: 3200 - 1500) is Rs. 1700 (Calculated: ${multanToSukkurFare})`);

    // 1D: Intermediate to Final Destination
    const multanToKarachiFare = Math.abs(multanStop.fareFromOrigin - karachiStop.fareFromOrigin);
    assert(multanToKarachiFare === 3300, `Segment fare (Multan -> Karachi: 4800 - 1500) is Rs. 3300 (Calculated: ${multanToKarachiFare})`);

    // 1E: Reverse Direction Segment
    const karachiToMultanFare = Math.abs(karachiStop.fareFromOrigin - multanStop.fareFromOrigin);
    assert(karachiToMultanFare === 3300, `Reverse segment fare (Karachi -> Multan) is Rs. 3300 (Calculated: ${karachiToMultanFare})`);

    // -------------------------------------------------------------
    // TEST SUITE 2: SEGMENT-BASED SEAT AVAILABILITY & ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Segment-Based Seat Availability & Overlap Isolation ---");

    const execBus = await prisma.bus.findFirst({ where: { layout: "2x2" } });
    const departureTime = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const testTrip = await prisma.trip.create({
      data: {
        routeId: longRoute.id,
        busId: execBus.id,
        direction: "FORWARD",
        departureTime,
        status: "CBL_TEST",
      },
    });

    // Book Seat #5 on leg 1: Lahore (stopOrder 1) -> Multan (stopOrder 2)
    const bookingLeg1 = await prisma.booking.create({
      data: {
        pnr: "CBLSEG01",
        tripId: testTrip.id,
        totalAmount: 1500,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        contactPhone: "0300-1111111",
        seats: {
          create: {
            tripId: testTrip.id,
            seatNo: 5,
            passengerName: "Passenger Leg 1",
            cnic: "35201-1111111-1",
            gender: "MALE",
            fromStopId: lahoreStop.id,
            toStopId: multanStop.id,
            fare: 1500,
          },
        },
      },
    });

    // Case 2A: Booking the SAME Seat #5 on NON-OVERLAPPING leg: Multan (stopOrder 2) -> Karachi (stopOrder 4) MUST SUCCEED
    const sessionLeg2 = "cbl_test_session_leg2";
    const lockNonOverlapRes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: multanStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionLeg2,
        seats: [{ seatNo: 5, gender: "MALE" }],
      },
    });
    assert(lockNonOverlapRes.status === 200, "Seat #5 successfully locked for non-overlapping leg (Multan -> Karachi)");

    // Case 2B: Booking the SAME Seat #5 on an OVERLAPPING leg: Lahore -> Sukkur MUST BE REJECTED
    const sessionOverlap = "cbl_test_session_overlap";
    const lockOverlapRes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: sukkurStop.id,
        sessionId: sessionOverlap,
        seats: [{ seatNo: 5, gender: "MALE" }],
      },
    });
    assert(lockOverlapRes.status === 409, "Seat #5 on overlapping leg (Lahore -> Sukkur) is BLOCKED with 409 Conflict");
    assert(lockOverlapRes.body.error?.includes("already booked"), "Error message clarifies seat is already booked on overlapping leg");

    // -------------------------------------------------------------
    // TEST SUITE 3: GENDER RULES & ADJACENT SEAT PROTECTION
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Gender Rules & Adjacent Seat Protection ---");

    // In 2x2 layout, Seat 5 is paired with Seat 6.
    const adjacentSeatTo5 = getAdjacentSeatNo(5, "2x2");
    assert(adjacentSeatTo5 === 6, `2x2 layout adjacent pairing: Seat 5 pairs with Seat 6 (Calculated: ${adjacentSeatTo5})`);

    // In 2x1 layout, solo seats have no adjacent seat (null)
    const soloSeatIn2x1 = getAdjacentSeatNo(3, "2x1");
    assert(soloSeatIn2x1 === null, `2x1 layout solo seat 3 has no adjacent seat (Calculated: null)`);

    // In 2x1 layout, paired seats: Seat 1 pairs with Seat 2
    const pairedSeatIn2x1 = getAdjacentSeatNo(1, "2x1");
    assert(pairedSeatIn2x1 === 2, `2x1 layout paired seat 1 pairs with Seat 2 (Calculated: ${pairedSeatIn2x1})`);

    // Create a confirmed FEMALE booking on Seat 7
    const bookingFemale = await prisma.booking.create({
      data: {
        pnr: "CBLGEN01",
        tripId: testTrip.id,
        totalAmount: 4800,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        contactPhone: "0300-2222222",
        seats: {
          create: {
            tripId: testTrip.id,
            seatNo: 7,
            passengerName: "Maryam Bibi",
            cnic: "35201-2222222-2",
            gender: "FEMALE",
            fromStopId: lahoreStop.id,
            toStopId: karachiStop.id,
            fare: 4800,
          },
        },
      },
    });

    // In 2x2 layout, Seat 7 pairs with Seat 8.
    // Case 3A: Male passenger attempts to lock Seat 8 next to Female on Seat 7 -> MUST BE REJECTED
    const sessionMale = "cbl_test_male_lock";
    const lockMaleRes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionMale,
        seats: [{ seatNo: 8, gender: "MALE" }],
      },
    });
    assert(lockMaleRes.status === 400, "Male lock next to Female on Seat 8 is REJECTED with 400 Bad Request");
    assert(lockMaleRes.body.error?.includes("female"), "Error explicitly mentions gender safety rule violation");

    // Case 3B: Female passenger attempts to lock Seat 8 next to Female on Seat 7 -> MUST SUCCEED
    const sessionFemale = "cbl_test_female_lock";
    const lockFemaleRes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionFemale,
        seats: [{ seatNo: 8, gender: "FEMALE" }],
      },
    });
    assert(lockFemaleRes.status === 200, "Female lock next to Female on Seat 8 is ALLOWED (200 OK)");

    // -------------------------------------------------------------
    // TEST SUITE 4: SEAT LOCK CONCURRENCY & EXPIRATION
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Seat Lock Concurrency & Expiration ---");

    // Session A locks Seat 10
    const sessionA = "cbl_test_session_A";
    const sessionB = "cbl_test_session_B";

    const lockSessionARes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionA,
        seats: [{ seatNo: 10, gender: "MALE" }],
      },
    });
    assert(lockSessionARes.status === 200, "Session A successfully locks Seat 10");

    // Concurrent Session B attempts to lock the SAME Seat 10 -> MUST BE REJECTED with 409 Conflict
    const lockSessionBRes = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionB,
        seats: [{ seatNo: 10, gender: "MALE" }],
      },
    });
    assert(lockSessionBRes.status === 409, "Concurrent Session B is BLOCKED from stealing Seat 10 (409 Conflict)");
    assert(lockSessionBRes.body.error?.includes("held by another customer"), "Error informs user seat is held by another session");

    // Same Session A can refresh/update its own lock
    const lockSessionAUpdate = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionA,
        seats: [
          { seatNo: 10, gender: "MALE" },
          { seatNo: 11, gender: "MALE" },
        ],
      },
    });
    assert(lockSessionAUpdate.status === 200, "Same Session A can extend and modify its own seat selection");

    // Test Expiration: Manually expire lock in database
    await prisma.seatLock.updateMany({
      where: { sessionId: sessionA },
      data: { lockedUntil: new Date(Date.now() - 5000) }, // 5 seconds in past
    });

    // Now Session B can lock Seat 10 because expired lock is cleared
    const lockSessionBAfterExpiry = await makeRequest("/api/seats/lock", {
      method: "POST",
      body: {
        tripId: testTrip.id,
        fromStopId: lahoreStop.id,
        toStopId: karachiStop.id,
        sessionId: sessionB,
        seats: [{ seatNo: 10, gender: "MALE" }],
      },
    });
    assert(lockSessionBAfterExpiry.status === 200, "Session B successfully acquires Seat 10 after Session A's lock expired");

    // -------------------------------------------------------------
    // TEST SUITE 5: REFUND CALCULATION TIERS
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Refund Calculation Tiers & Policy Engine ---");

    const now = new Date();

    // 5A: Cancellation > 24 Hours (e.g. 36 hours before departure) -> 100% Refund
    const dep36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const policy36h = calculateRefundPolicy(dep36h, 4000, "PAID", now);
    assert(policy36h.isAllowed === true, "Cancellation > 24h is allowed");
    assert(policy36h.refundPercentage === 100, `Refund percentage > 24h is 100% (Calculated: ${policy36h.refundPercentage}%)`);
    assert(policy36h.refundAmount === 4000, `Full refund amount of Rs. 4000 computed (Calculated: ${policy36h.refundAmount})`);

    // 5B: Cancellation 6 to 24 Hours (e.g. 14 hours before departure) -> 75% Refund
    const dep14h = new Date(now.getTime() + 14 * 60 * 60 * 1000);
    const policy14h = calculateRefundPolicy(dep14h, 4000, "PAID", now);
    assert(policy14h.isAllowed === true, "Cancellation 6-24h is allowed");
    assert(policy14h.refundPercentage === 75, `Refund percentage 6-24h is 75% (Calculated: ${policy14h.refundPercentage}%)`);
    assert(policy14h.refundAmount === 3000, `75% refund of Rs. 3000 computed (Calculated: ${policy14h.refundAmount})`);

    // 5C: Cancellation < 6 Hours (e.g. 2.5 hours before departure) -> 50% Refund
    const dep2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    const policy2h = calculateRefundPolicy(dep2h, 4000, "PAID", now);
    assert(policy2h.isAllowed === true, "Cancellation < 6h is allowed");
    assert(policy2h.refundPercentage === 50, `Refund percentage < 6h is 50% (Calculated: ${policy2h.refundPercentage}%)`);
    assert(policy2h.refundAmount === 2000, `50% refund of Rs. 2000 computed (Calculated: ${policy2h.refundAmount})`);

    // 5D: Cancellation Post-Departure (e.g. -1 hour past departure) -> Blocked (0% Refund)
    const depPast = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const policyPast = calculateRefundPolicy(depPast, 4000, "PAID", now);
    assert(policyPast.isAllowed === false, "Cancellation after departure is BLOCKED (isAllowed: false)");
    assert(policyPast.refundPercentage === 0, `Post-departure refund percentage is 0% (Calculated: ${policyPast.refundPercentage}%)`);
    assert(policyPast.refundAmount === 0, `Post-departure refund amount is Rs. 0 (Calculated: ${policyPast.refundAmount})`);

    // 5E: Unpaid Booking Cancellation -> 0 Refund Amount (no charge)
    const policyUnpaid = calculateRefundPolicy(dep36h, 4000, "UNPAID", now);
    assert(policyUnpaid.refundAmount === 0, "Unpaid booking cancellation calculates Rs. 0 cash refund");

    // Clean up test data
    await prisma.seatLock.deleteMany({ where: { sessionId: { startsWith: "cbl_test_" } } });
    await prisma.bookingSeat.deleteMany({ where: { booking: { pnr: { in: ["CBLSEG01", "CBLGEN01"] } } } });
    await prisma.payment.deleteMany({ where: { booking: { pnr: { in: ["CBLSEG01", "CBLGEN01"] } } } });
    await prisma.booking.deleteMany({ where: { pnr: { in: ["CBLSEG01", "CBLGEN01"] } } });
    await prisma.trip.delete({ where: { id: testTrip.id } });

    console.log("\n==================================================================");
    console.log(`🏁 CORE BUSINESS LOGIC SUITE: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
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

runCoreBusinessLogicTests();
