import express from 'express';
import cors from 'cors';
import { db } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// GET dashboard statistics
app.get('/api/dashboard', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET all rooms (optionally filtered by type and status)
app.get('/api/rooms', async (req, res) => {
  try {
    let rooms = await db.getRooms();
    const { status, type } = req.query;

    if (status) {
      rooms = rooms.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (type) {
      rooms = rooms.filter(r => r.type.toLowerCase() === type.toLowerCase());
    }

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT update room status (Available, Occupied, Maintenance)
app.put('/api/rooms/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Available', 'Occupied', 'Maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid room status. Must be Available, Occupied, or Maintenance.' });
    }

    const updatedRoom = await db.updateRoomStatus(id, status);
    res.json(updatedRoom);
  } catch (error) {
    console.error(`Error updating status for room ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT update room nightly rate
app.put('/api/rooms/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    if (rate === undefined || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) {
      return res.status(400).json({ error: 'Invalid price rate. Must be a positive number.' });
    }

    const updatedRoom = await db.updateRoomRate(id, rate);
    res.json(updatedRoom);
  } catch (error) {
    console.error(`Error updating rate for room ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// GET bookings list
app.get('/api/bookings', async (req, res) => {
  try {
    let bookings = await db.getBookings();
    const { status, search } = req.query;

    if (status) {
      bookings = bookings.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const searchLower = search.toLowerCase();
      bookings = bookings.filter(b => 
        b.guestName.toLowerCase().includes(searchLower) ||
        b.guestEmail.toLowerCase().includes(searchLower) ||
        b.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort bookings by creation date descending
    bookings.sort((a, b) => b.id.localeCompare(a.id));

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create a booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { roomId, guestName, guestEmail, guestPhone, checkIn, checkOut } = req.body;

    if (!roomId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'All fields (roomId, guestName, guestEmail, guestPhone, checkIn, checkOut) are required.' });
    }

    const newBooking = await db.createBooking({
      roomId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut
    });

    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT update booking status (Confirmed, CheckedIn, CheckedOut, Cancelled)
app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const result = await db.updateBookingStatus(id, status);
    res.json(result);
  } catch (error) {
    console.error(`Error updating status for booking ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start Express API Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hotel Management backend running on http://localhost:${PORT}`);
});
