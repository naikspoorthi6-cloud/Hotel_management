import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Helper to ensure target directory exists
async function ensureDbExists() {
  const dir = path.dirname(DB_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Ignore edit if directory already exists
  }

  try {
    await fs.access(DB_FILE);
  } catch (err) {
    // Initialize default rooms and bookings if file does not exist
    const defaultData = getInitialMockData();
    await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function getInitialMockData() {
  const rooms = [
    { id: "101", number: "101", type: "Single", rate: 80, status: "Available" },
    { id: "102", number: "102", type: "Single", rate: 80, status: "Available" },
    { id: "103", number: "103", type: "Single", rate: 85, status: "Maintenance" },
    { id: "201", number: "201", type: "Double", rate: 120, status: "Occupied" },
    { id: "202", number: "202", type: "Double", rate: 120, status: "Available" },
    { id: "203", number: "203", type: "Double", rate: 125, status: "Occupied" },
    { id: "301", number: "301", type: "Deluxe", rate: 180, status: "Available" },
    { id: "302", number: "302", type: "Deluxe", rate: 180, status: "Occupied" },
    { id: "401", number: "401", type: "Suite", rate: 320, status: "Available" },
    { id: "402", number: "402", type: "Suite", rate: 350, status: "Available" }
  ];

  // Helper dates relative to today
  const today = new Date();
  const formatDateOffset = (days) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const bookings = [
    {
      id: "b1",
      roomId: "201",
      guestName: "Alice Smith",
      guestEmail: "alice@gmail.com",
      guestPhone: "+1-555-0199",
      checkIn: formatDateOffset(-3),
      checkOut: formatDateOffset(2),
      status: "CheckedIn",
      totalAmount: 600,
      createdAt: formatDateOffset(-4)
    },
    {
      id: "b2",
      roomId: "203",
      guestName: "Bob Jones",
      guestEmail: "bob@jones.com",
      guestPhone: "+1-555-0234",
      checkIn: formatDateOffset(-1),
      checkOut: formatDateOffset(4),
      status: "CheckedIn",
      totalAmount: 625,
      createdAt: formatDateOffset(-2)
    },
    {
      id: "b3",
      roomId: "302",
      guestName: "Charlie Brown",
      guestEmail: "charlie@hq.com",
      guestPhone: "+1-555-9876",
      checkIn: formatDateOffset(-5),
      checkOut: formatDateOffset(2),
      status: "CheckedIn",
      totalAmount: 1260,
      createdAt: formatDateOffset(-6)
    },
    {
      id: "b4",
      roomId: "401",
      guestName: "Diana Prince",
      guestEmail: "diana@wonder.com",
      guestPhone: "+1-555-4321",
      checkIn: formatDateOffset(3),
      checkOut: formatDateOffset(8),
      status: "Confirmed",
      totalAmount: 1600,
      createdAt: formatDateOffset(-1)
    }
  ];

  return { rooms, bookings };
}

async function readData() {
  await ensureDbExists();
  const content = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(content);
}

async function writeData(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  // Rooms Interface
  async getRooms() {
    const data = await readData();
    return data.rooms;
  },

  async updateRoomStatus(roomId, status) {
    const data = await readData();
    const index = data.rooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
      data.rooms[index].status = status;
      await writeData(data);
      return data.rooms[index];
    }
    throw new Error(`Room with ID ${roomId} not found.`);
  },

  async updateRoomRate(roomId, rate) {
    const data = await readData();
    const index = data.rooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
      data.rooms[index].rate = parseFloat(rate);
      await writeData(data);
      return data.rooms[index];
    }
    throw new Error(`Room with ID ${roomId} not found.`);
  },

  // Bookings Interface
  async getBookings() {
    const data = await readData();
    return data.bookings;
  },

  async createBooking(bookingData) {
    const data = await readData();
    const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone } = bookingData;

    // Verify room exists
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error(`Room with ID ${roomId} does not exist.`);
    }

    // Check overlaps with existing active/confirmed bookings
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      throw new Error("Check-out date must be after check-in date.");
    }

    const overlap = data.bookings.find(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === "Cancelled" || b.status === "CheckedOut") return false;

      const bCheckIn = new Date(b.checkIn);
      const bCheckOut = new Date(b.checkOut);
      return checkInDate < bCheckOut && checkOutDate > bCheckIn;
    });

    if (overlap) {
      throw new Error(`Room ${room.number} is already booked from ${overlap.checkIn} to ${overlap.checkOut}.`);
    }

    // Calculate total amount
    const diffTime = Math.abs(checkOutDate - checkInDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalAmount = diffDays * room.rate;

    const newBooking = {
      id: "b_" + Date.now(),
      roomId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      status: "Confirmed",
      totalAmount,
      createdAt: new Date().toISOString().split('T')[0]
    };

    data.bookings.push(newBooking);
    await writeData(data);
    return newBooking;
  },

  async updateBookingStatus(bookingId, status) {
    const data = await readData();
    const bIndex = data.bookings.findIndex(b => b.id === bookingId);
    if (bIndex === -1) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    const booking = data.bookings[bIndex];
    booking.status = status;

    // Auto-update room status depending on booking transitions
    // Confirmed -> CheckedIn: Update room to Occupied
    // CheckedIn -> CheckedOut: Update room to Available
    const roomIndex = data.rooms.findIndex(r => r.id === booking.roomId);
    if (roomIndex !== -1) {
      if (status === "CheckedIn") {
        data.rooms[roomIndex].status = "Occupied";
      } else if (status === "CheckedOut") {
        data.rooms[roomIndex].status = "Available";
      }
    }

    await writeData(data);
    return { booking, room: roomIndex !== -1 ? data.rooms[roomIndex] : null };
  },

  // Dashboard Stats interface
  async getDashboardStats() {
    const data = await readData();
    const rooms = data.rooms;
    const bookings = data.bookings;

    // Helper date comparison
    const todayStr = new Date().toISOString().split('T')[0];

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === "Occupied").length;
    const maintenanceRooms = rooms.filter(r => r.status === "Maintenance").length;
    const availableRooms = totalRooms - occupiedRooms - maintenanceRooms;

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / (totalRooms - maintenanceRooms)) * 100) : 0;

    // Today's Checkins & Checkouts relative to bookings
    const arrivalsToday = bookings.filter(b => b.checkIn === todayStr && b.status === "Confirmed").length;
    const departuresToday = bookings.filter(b => b.checkOut === todayStr && b.status === "CheckedIn").length;

    // Total monthly earnings (sum of CheckedOut/CheckedIn/Confirmed bookings totalAmount)
    const activeBookings = bookings.filter(b => b.status !== "Cancelled");
    const totalEarnings = activeBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      occupancyRate,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      arrivalsToday,
      departuresToday,
      totalEarnings
    };
  }
};
