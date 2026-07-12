# Hotel Management System

A simple full-stack hotel management application with a Node.js/Express backend and a Vite frontend. It provides room management, booking management, and dashboard statistics for hotel operations.

## Features

- Dashboard overview with key hotel metrics
- View and filter rooms by status and type
- Update room availability and nightly rate
- Manage bookings with search and status filtering
- Create new bookings from the frontend

## Project Structure

- backend/ - Express API server and JSON-based data access
- frontend/ - Vite-based user interface

## Prerequisites

- Node.js (v18 or later recommended)
- npm

## Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm start
   ```

The backend will run on http://localhost:5000.

## Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will usually open on http://localhost:5173.

## API Endpoints

### Dashboard
- GET /api/dashboard

### Rooms
- GET /api/rooms
- PUT /api/rooms/:id/status
- PUT /api/rooms/:id/rate

### Bookings
- GET /api/bookings
- POST /api/bookings
- PUT /api/bookings/:id/status

## Notes

- The backend uses a JSON file in the backend/data folder as a lightweight data store.
- The frontend communicates with the backend API through the configured Vite proxy or direct API URL.

## License

This project is for educational/demo purposes.
