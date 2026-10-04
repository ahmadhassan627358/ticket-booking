/**
 * Bus Layout & Seat Adjacency Helpers
 * Supports 2x1 (Business - 30 seats) and 2x2 (Executive - 44 seats)
 */

export interface SeatInfo {
  seatNo: number;
  row: number;
  column: "A" | "B" | "C" | "D";
  side: "LEFT" | "RIGHT";
  isAisle: boolean;
  adjacentSeatNo: number | null;
}

export function getAdjacentSeatNo(seatNo: number, layout: string = "2x2"): number | null {
  if (layout === "2x1") {
    const remainder = seatNo % 3;
    if (remainder === 1) return seatNo + 1;
    if (remainder === 2) return seatNo - 1;
    return null; // Single seat on right side
  } else {
    // Default: 2x2
    const remainder = seatNo % 4;
    if (remainder === 1) return seatNo + 1;
    if (remainder === 2) return seatNo - 1;
    if (remainder === 3) return seatNo + 1;
    return seatNo - 1; // remainder === 0 (seat 4, 8, 12...)
  }
}

export function generateBusSeatGrid(totalSeats: number, layout: string = "2x2"): {
  rows: {
    rowNumber: number;
    leftSeats: SeatInfo[];
    rightSeats: SeatInfo[];
  }[];
} {
  const seatsPerRow = layout === "2x1" ? 3 : 4;
  const numRows = Math.ceil(totalSeats / seatsPerRow);
  const rows = [];

  for (let r = 1; r <= numRows; r++) {
    const leftSeats: SeatInfo[] = [];
    const rightSeats: SeatInfo[] = [];

    if (layout === "2x1") {
      const s1 = (r - 1) * 3 + 1;
      const s2 = (r - 1) * 3 + 2;
      const s3 = (r - 1) * 3 + 3;

      if (s1 <= totalSeats) {
        leftSeats.push({
          seatNo: s1,
          row: r,
          column: "A",
          side: "LEFT",
          isAisle: false,
          adjacentSeatNo: s2 <= totalSeats ? s2 : null,
        });
      }

      if (s2 <= totalSeats) {
        leftSeats.push({
          seatNo: s2,
          row: r,
          column: "B",
          side: "LEFT",
          isAisle: true,
          adjacentSeatNo: s1,
        });
      }

      if (s3 <= totalSeats) {
        rightSeats.push({
          seatNo: s3,
          row: r,
          column: "C",
          side: "RIGHT",
          isAisle: true,
          adjacentSeatNo: null,
        });
      }
    } else {
      // 2x2 Layout
      const s1 = (r - 1) * 4 + 1;
      const s2 = (r - 1) * 4 + 2;
      const s3 = (r - 1) * 4 + 3;
      const s4 = (r - 1) * 4 + 4;

      if (s1 <= totalSeats) {
        leftSeats.push({
          seatNo: s1,
          row: r,
          column: "A",
          side: "LEFT",
          isAisle: false,
          adjacentSeatNo: s2 <= totalSeats ? s2 : null,
        });
      }

      if (s2 <= totalSeats) {
        leftSeats.push({
          seatNo: s2,
          row: r,
          column: "B",
          side: "LEFT",
          isAisle: true,
          adjacentSeatNo: s1,
        });
      }

      if (s3 <= totalSeats) {
        rightSeats.push({
          seatNo: s3,
          row: r,
          column: "C",
          side: "RIGHT",
          isAisle: true,
          adjacentSeatNo: s4 <= totalSeats ? s4 : null,
        });
      }

      if (s4 <= totalSeats) {
        rightSeats.push({
          seatNo: s4,
          row: r,
          column: "D",
          side: "RIGHT",
          isAisle: false,
          adjacentSeatNo: s3,
        });
      }
    }

    rows.push({
      rowNumber: r,
      leftSeats,
      rightSeats,
    });
  }

  return { rows };
}
