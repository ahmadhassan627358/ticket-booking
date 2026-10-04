import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export interface TicketPdfData {
  pnr: string;
  routeName: string;
  fromCity: string;
  toCity: string;
  departureTime: Date;
  busNumber: string;
  busType: string;
  busLayout: string;
  totalAmount: number;
  contactPhone: string;
  createdAt: Date;
  seats: Array<{
    seatNo: number;
    passengerName: string;
    cnic: string;
    gender: string;
    fare: number;
  }>;
}

/**
 * Masks a Pakistani CNIC for privacy (e.g., 35201-1234567-1 -> 35201-*******-1)
 */
export function maskCNIC(cnic: string): string {
  const cleaned = cnic.replace(/[\s\-]/g, "");
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 5)}-*******-${cleaned.slice(12)}`;
  }
  if (cnic.includes("-")) {
    const parts = cnic.split("-");
    if (parts.length === 3) {
      return `${parts[0]}-*******-${parts[2]}`;
    }
  }
  return cnic;
}

export async function generateTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // Standard A4 (width x height in points)
  const { width, height } = page.getSize();

  // Standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.CourierBold);

  // Colors
  const primaryBlue = rgb(0.06, 0.22, 0.45); // Deep Navy #0f3873
  const accentSky = rgb(0.12, 0.53, 0.90);   // Sky Blue
  const darkSlate = rgb(0.1, 0.15, 0.2);     // Slate #1a2634
  const lightBg = rgb(0.95, 0.97, 1.0);      // Very light blue-gray
  const borderGray = rgb(0.82, 0.86, 0.92);
  const textMuted = rgb(0.4, 0.45, 0.55);
  const white = rgb(1, 1, 1);
  const successGreen = rgb(0.08, 0.58, 0.28);

  // 1. Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: primaryBlue,
  });

  page.drawText("SAFAR EXPRESS", {
    x: 40,
    y: height - 48,
    size: 22,
    font: fontBold,
    color: white,
  });

  page.drawText("PAKISTAN LUXURY INTERCITY TRANSIT", {
    x: 40,
    y: height - 68,
    size: 9,
    font: fontBold,
    color: accentSky,
  });

  page.drawText("OFFICIAL E-TICKET", {
    x: width - 170,
    y: height - 48,
    size: 14,
    font: fontBold,
    color: white,
  });

  page.drawText(`Issued: ${data.createdAt.toLocaleDateString("en-PK")}`, {
    x: width - 170,
    y: height - 66,
    size: 8,
    font: fontRegular,
    color: white,
  });

  // 2. PNR & Status Card Banner
  const bannerY = height - 170;
  page.drawRectangle({
    x: 40,
    y: bannerY,
    width: width - 80,
    height: 55,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText("BOOKING REFERENCE (PNR)", {
    x: 55,
    y: bannerY + 35,
    size: 8,
    font: fontBold,
    color: textMuted,
  });

  page.drawText(data.pnr, {
    x: 55,
    y: bannerY + 12,
    size: 20,
    font: fontMono,
    color: primaryBlue,
  });

  page.drawText("STATUS", {
    x: 230,
    y: bannerY + 35,
    size: 8,
    font: fontBold,
    color: textMuted,
  });

  page.drawText("CONFIRMED & PAID", {
    x: 230,
    y: bannerY + 16,
    size: 12,
    font: fontBold,
    color: successGreen,
  });

  page.drawText("CONTACT MOBILE", {
    x: 390,
    y: bannerY + 35,
    size: 8,
    font: fontBold,
    color: textMuted,
  });

  page.drawText(data.contactPhone, {
    x: 390,
    y: bannerY + 16,
    size: 11,
    font: fontBold,
    color: darkSlate,
  });

  // 3. Journey Details Card
  const journeyY = bannerY - 140;
  page.drawRectangle({
    x: 40,
    y: journeyY,
    width: width - 80,
    height: 125,
    color: white,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Section Header
  page.drawRectangle({
    x: 40,
    y: journeyY + 98,
    width: width - 80,
    height: 27,
    color: lightBg,
  });

  page.drawText("JOURNEY INFORMATION", {
    x: 55,
    y: journeyY + 107,
    size: 9,
    font: fontBold,
    color: primaryBlue,
  });

  // Boarding Point
  page.drawText("ORIGIN / BOARDING TERMINAL", {
    x: 55,
    y: journeyY + 75,
    size: 7.5,
    font: fontBold,
    color: textMuted,
  });
  page.drawText(data.fromCity, {
    x: 55,
    y: journeyY + 56,
    size: 14,
    font: fontBold,
    color: darkSlate,
  });

  // Route Name
  page.drawText(`Route: ${data.routeName}`, {
    x: 55,
    y: journeyY + 38,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  // Dropping Point
  page.drawText("DESTINATION / DROPPING TERMINAL", {
    x: 230,
    y: journeyY + 75,
    size: 7.5,
    font: fontBold,
    color: textMuted,
  });
  page.drawText(data.toCity, {
    x: 230,
    y: journeyY + 56,
    size: 14,
    font: fontBold,
    color: darkSlate,
  });

  // Departure Time
  const dateStr = data.departureTime.toLocaleDateString("en-PK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = data.departureTime.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  page.drawText(`Date: ${dateStr}`, {
    x: 230,
    y: journeyY + 38,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  // Bus Details & Departure Time
  page.drawText("BUS & DEPARTURE", {
    x: 420,
    y: journeyY + 75,
    size: 7.5,
    font: fontBold,
    color: textMuted,
  });
  page.drawText(timeStr, {
    x: 420,
    y: journeyY + 56,
    size: 14,
    font: fontBold,
    color: accentSky,
  });
  page.drawText(`${data.busType} (${data.busLayout}) - Bus #${data.busNumber}`, {
    x: 420,
    y: journeyY + 38,
    size: 8.5,
    font: fontRegular,
    color: textMuted,
  });

  // 4. Passenger Roster Table
  const tableY = journeyY - 170;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: width - 80,
    height: 155,
    color: white,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Table Header
  page.drawRectangle({
    x: 40,
    y: tableY + 130,
    width: width - 80,
    height: 25,
    color: lightBg,
  });

  page.drawText("SEAT", { x: 55, y: tableY + 138, size: 8, font: fontBold, color: primaryBlue });
  page.drawText("PASSENGER NAME", { x: 110, y: tableY + 138, size: 8, font: fontBold, color: primaryBlue });
  page.drawText("CNIC (IDENTITY)", { x: 260, y: tableY + 138, size: 8, font: fontBold, color: primaryBlue });
  page.drawText("GENDER", { x: 390, y: tableY + 138, size: 8, font: fontBold, color: primaryBlue });
  page.drawText("FARE", { x: 480, y: tableY + 138, size: 8, font: fontBold, color: primaryBlue });

  // Rows
  let rowY = tableY + 105;
  data.seats.forEach((seat) => {
    page.drawText(String(seat.seatNo), { x: 62, y: rowY, size: 10, font: fontBold, color: accentSky });
    page.drawText(seat.passengerName, { x: 110, y: rowY, size: 9, font: fontBold, color: darkSlate });
    page.drawText(maskCNIC(seat.cnic), { x: 260, y: rowY, size: 9, font: fontMono, color: textMuted });
    page.drawText(seat.gender, { x: 390, y: rowY, size: 9, font: fontRegular, color: darkSlate });
    page.drawText(`Rs. ${seat.fare.toLocaleString()}`, { x: 480, y: rowY, size: 9, font: fontBold, color: darkSlate });
    rowY -= 22;
  });

  // Total Summary
  page.drawLine({
    start: { x: 40, y: tableY + 30 },
    end: { x: width - 40, y: tableY + 30 },
    color: borderGray,
    thickness: 1,
  });

  page.drawText(`Total Passengers: ${data.seats.length}`, {
    x: 55,
    y: tableY + 12,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  page.drawText(`TOTAL FARE PAID: Rs. ${data.totalAmount.toLocaleString()}`, {
    x: 350,
    y: tableY + 10,
    size: 12,
    font: fontBold,
    color: successGreen,
  });

  // 5. QR Code & Verification Block
  const qrSectionY = tableY - 145;
  page.drawRectangle({
    x: 40,
    y: qrSectionY,
    width: width - 80,
    height: 130,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Generate QR Code containing PNR verification
  const qrDataUrl = await QRCode.toDataURL(
    `https://safar.pk/track?pnr=${data.pnr}&seats=${data.seats.map((s) => s.seatNo).join(",")}`,
    { width: 180, margin: 1 }
  );
  const qrPng = await doc.embedPng(qrDataUrl);

  page.drawImage(qrPng, {
    x: 55,
    y: qrSectionY + 15,
    width: 100,
    height: 100,
  });

  page.drawText("BOARDING PASS QR VERIFICATION", {
    x: 170,
    y: qrSectionY + 95,
    size: 10,
    font: fontBold,
    color: primaryBlue,
  });

  page.drawText(
    "Scan this QR code at the bus entry gate or ticket counter to verify booking and boarding clearance.",
    {
      x: 170,
      y: qrSectionY + 75,
      size: 8,
      font: fontRegular,
      color: textMuted,
      maxWidth: 320,
      lineHeight: 12,
    }
  );

  page.drawText(`PNR: ${data.pnr}  •  Trip ID: ${data.busNumber}  •  24/7 Helpline: 042-111-72327`, {
    x: 170,
    y: qrSectionY + 30,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  // 6. Terms & Boarding Guidelines Footer
  page.drawText("TERMS & BOARDING CONDITIONS:", {
    x: 40,
    y: 85,
    size: 8,
    font: fontBold,
    color: darkSlate,
  });

  const terms = [
    "1. Passengers must report at the departure terminal at least 30 minutes before departure time.",
    "2. Valid original CNIC of all passengers is mandatory at the time of boarding.",
    "3. Cancellation Policy: >24h = 100% refund, 6h-24h = 75% refund, <6h = 50% refund. After departure no refund.",
    "4. Up to 30 kg baggage allowed per ticket. Hazardous and flammable items are strictly prohibited.",
  ];

  let termY = 70;
  terms.forEach((t) => {
    page.drawText(t, {
      x: 40,
      y: termY,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });
    termY -= 12;
  });

  return await doc.save();
}
