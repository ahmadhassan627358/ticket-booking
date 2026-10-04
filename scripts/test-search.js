async function testSearches() {
  console.log('🔍 Testing Safar Express Trip Search API...\n');

  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`Search Date: ${todayStr}\n`);

  // Scenario 1: Lahore to Islamabad
  console.log('--- Test 1: Lahore -> Islamabad (Forward) ---');
  const res1 = await fetch(`http://localhost:3000/api/trips/search?from=Lahore&to=Islamabad&date=${todayStr}`);
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, Trips Found: ${data1.totalFound}`);
  if (data1.trips && data1.trips.length > 0) {
    const t = data1.trips[0];
    console.log(`  Sample Trip: ${t.bus.number} (${t.bus.type})`);
    console.log(`  Direction: ${t.direction}`);
    console.log(`  Fare: Rs. ${t.fare} (Expected: Rs. 2200)`);
    console.log(`  Departure: ${t.departureTime}, Arrival: ${t.estimatedArrival}`);
    console.log(`  Available Seats: ${t.availableSeats} / ${t.bus.totalSeats}`);
  }

  // Scenario 2: Karachi to Lahore (Reverse direction)
  console.log('\n--- Test 2: Karachi -> Lahore (Reverse Direction) ---');
  const res2 = await fetch(`http://localhost:3000/api/trips/search?from=Karachi&to=Lahore&date=${todayStr}`);
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, Trips Found: ${data2.totalFound}`);
  if (data2.trips && data2.trips.length > 0) {
    const t = data2.trips[0];
    console.log(`  Sample Trip: ${t.bus.number} (${t.bus.type})`);
    console.log(`  Direction: ${t.direction}`);
    console.log(`  Fare: Rs. ${t.fare} (Expected: Rs. 4800)`);
    console.log(`  Departure: ${t.departureTime}, Arrival: ${t.estimatedArrival}`);
    console.log(`  Available Seats: ${t.availableSeats} / ${t.bus.totalSeats}`);
  }

  // Scenario 3: Lahore to Multan (Intermediate stop on Lahore-Karachi route)
  console.log('\n--- Test 3: Lahore -> Multan (Intermediate Stop) ---');
  const res3 = await fetch(`http://localhost:3000/api/trips/search?from=Lahore&to=Multan&date=${todayStr}`);
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Trips Found: ${data3.totalFound}`);
  if (data3.trips && data3.trips.length > 0) {
    const t = data3.trips[0];
    console.log(`  Sample Trip: ${t.bus.number} (${t.bus.type})`);
    console.log(`  Route: ${t.routeName}`);
    console.log(`  Direction: ${t.direction}`);
    console.log(`  Fare: Rs. ${t.fare} (Expected: Rs. 1500)`);
    console.log(`  Departure: ${t.departureTime}, Arrival: ${t.estimatedArrival}`);
    console.log(`  Available Seats: ${t.availableSeats} / ${t.bus.totalSeats}`);
  }

  console.log('\n✅ ALL SEARCH API TESTS COMPLETED!');
}

testSearches().catch(err => {
  console.error('Search test error:', err);
  process.exit(1);
});
