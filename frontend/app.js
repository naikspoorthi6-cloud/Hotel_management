// Application State
let state = {
  rooms: [],
  bookings: [],
  stats: {},
  currentView: 'dashboard'
};

// API Base URL (uses Vite proxy mapping to http://localhost:5000 in dev)
const API_URL = '/api';

// DOM Element Handlers
const DOM = {
  navLinks: document.querySelectorAll('.nav-link'),
  viewPanels: document.querySelectorAll('.view-panel'),
  viewTitle: document.getElementById('view-title'),
  
  // Dashboard Elements
  statOccupancy: document.getElementById('stat-occupancy'),
  statAvailable: document.getElementById('stat-available'),
  statOccupied: document.getElementById('stat-occupied'),
  statEarnings: document.getElementById('stat-earnings'),
  todayOpsTable: document.getElementById('today-operations-table'),
  actionTodayArrivals: document.getElementById('action-today-arrivals'),
  actionTodayDepartures: document.getElementById('action-today-departures'),
  actionRoomsMaintenance: document.getElementById('action-rooms-maintenance'),
  
  // Rooms View Elements
  roomsGrid: document.getElementById('rooms-directory-grid'),
  filterRoomType: document.getElementById('filter-room-type'),
  filterRoomStatus: document.getElementById('filter-room-status'),
  
  // Bookings View Elements
  bookingsTable: document.getElementById('bookings-ledger-table'),
  searchBookingInput: document.getElementById('search-booking-input'),
  filterBookingStatus: document.getElementById('filter-booking-status'),
  
  // Booking Modal
  bookingModal: document.getElementById('booking-modal'),
  openBookingBtn: document.getElementById('open-booking-modal-btn'),
  closeBookingBtn: document.getElementById('close-booking-modal-btn'),
  cancelBookingBtn: document.getElementById('cancel-booking-btn'),
  bookingForm: document.getElementById('new-booking-form'),
  bookingRoomSelect: document.getElementById('booking-room-select'),
  bookingCheckIn: document.getElementById('booking-checkin'),
  bookingCheckOut: document.getElementById('booking-checkout'),
  bookingEstimateBox: document.getElementById('booking-estimate-box'),
  bookingEstimatedPrice: document.getElementById('booking-estimated-price'),
  
  // Room Edit Modal
  roomEditModal: document.getElementById('room-edit-modal'),
  closeRoomEditBtn: document.getElementById('close-room-modal-btn'),
  cancelRoomEditBtn: document.getElementById('cancel-room-btn'),
  roomEditForm: document.getElementById('edit-room-form'),
  roomEditId: document.getElementById('edit-room-id'),
  roomEditNumber: document.getElementById('edit-room-number-display'),
  roomEditStatus: document.getElementById('edit-room-status-select'),
  roomEditRate: document.getElementById('edit-room-rate-input'),
  
  // Alerts
  toastContainer: document.getElementById('toast-container')
};

// Switch Active View
function switchView(viewName) {
  state.currentView = viewName;
  
  // Update Navigation UI
  DOM.navLinks.forEach(link => {
    if (link.dataset.view === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Switch View Content Panels
  DOM.viewPanels.forEach(panel => {
    if (panel.id === `${viewName}-view`) {
      panel.classList.remove('hide');
    } else {
      panel.classList.add('hide');
    }
  });

  // Set page headers titles
  const titleMap = {
    dashboard: 'Dashboard',
    rooms: 'Rooms Directory',
    bookings: 'Bookings Ledger'
  };
  DOM.viewTitle.textContent = titleMap[viewName] || 'Metropolis';
  
  // Refresh content on view swaps
  refreshData();
}

// Global Refresh Action
async function refreshData() {
  await Promise.all([
    fetchStats(),
    fetchRooms(),
    fetchBookings()
  ]);
  
  // Render based on current view
  if (state.currentView === 'dashboard') {
    renderDashboard();
  } else if (state.currentView === 'rooms') {
    renderRooms();
  } else if (state.currentView === 'bookings') {
    renderBookings();
  }
  
  updateRoomOptions();
}

// ---------------- API DATA FETCHERS ----------------

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
    state.stats = await res.json();
    updateStatsUI();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function fetchRooms() {
  try {
    const res = await fetch(`${API_URL}/rooms`);
    if (!res.ok) throw new Error('Failed to fetch rooms');
    state.rooms = await res.json();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function fetchBookings() {
  try {
    const res = await fetch(`${API_URL}/bookings`);
    if (!res.ok) throw new Error('Failed to fetch bookings ledger');
    state.bookings = await res.json();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------- UI RENDER LOGIC ----------------

function updateStatsUI() {
  DOM.statOccupancy.textContent = `${state.stats.occupancyRate}%`;
  DOM.statAvailable.textContent = state.stats.availableRooms;
  DOM.statOccupied.textContent = state.stats.occupiedRooms;
  DOM.statEarnings.textContent = `₹${state.stats.totalEarnings}`;
  
  DOM.actionTodayArrivals.textContent = state.stats.arrivalsToday;
  DOM.actionTodayDepartures.textContent = state.stats.departuresToday;
  DOM.actionRoomsMaintenance.textContent = state.stats.maintenanceRooms;
}

function renderDashboard() {
  DOM.todayOpsTable.innerHTML = '';
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Combine Arrivals (Confirmed checkIn == today) & Departures (CheckedIn checkOut == today)
  const todayBookings = state.bookings.filter(b => 
    (b.checkIn === todayStr && b.status === 'Confirmed') ||
    (b.checkOut === todayStr && b.status === 'CheckedIn')
  );

  if (todayBookings.length === 0) {
    DOM.todayOpsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No check-in or check-out tasks scheduled for today.</td></tr>`;
    return;
  }

  todayBookings.forEach(b => {
    const isCheckIn = b.checkIn === todayStr && b.status === 'Confirmed';
    const tr = document.createElement('tr');
    
    // Find room number
    const room = state.rooms.find(r => r.id === b.roomId);
    const roomNum = room ? room.number : 'Unknown';
    const directionBadge = isCheckIn 
      ? `<span class="badge badge-pending">Arrival (Check-in)</span>`
      : `<span class="badge badge-cancelled">Departure (Check-out)</span>`;
      
    const actionBtn = isCheckIn 
      ? `<button class="btn-small btn-small-success" onclick="executeStatusUpdate('${b.id}', 'CheckedIn')">Verify Check-In</button>`
      : `<button class="btn-small btn-small-primary" onclick="executeStatusUpdate('${b.id}', 'CheckedOut')">Verify Check-Out</button>`;

    tr.innerHTML = `
      <td>${b.guestName}</td>
      <td><strong>${roomNum}</strong></td>
      <td>${b.checkIn} to ${b.checkOut}</td>
      <td>${directionBadge}</td>
      <td>${actionBtn}</td>
    `;
    DOM.todayOpsTable.appendChild(tr);
  });
}

function renderRooms() {
  DOM.roomsGrid.innerHTML = '';
  
  // Filter state
  const typeFilter = DOM.filterRoomType.value;
  const statusFilter = DOM.filterRoomStatus.value;
  
  let filteredRooms = [...state.rooms];
  if (typeFilter) filteredRooms = filteredRooms.filter(r => r.type === typeFilter);
  if (statusFilter) filteredRooms = filteredRooms.filter(r => r.status === statusFilter);

  filteredRooms.forEach(r => {
    const card = document.createElement('div');
    card.className = 'room-card';
    
    let statusClass = 'badge-available';
    if (r.status === 'Occupied') statusClass = 'badge-occupied';
    if (r.status === 'Maintenance') statusClass = 'badge-maintenance';

    card.innerHTML = `
      <div class="room-number">
        Room ${r.number}
        <span class="room-type">${r.type}</span>
      </div>
      <div class="room-price">₹${r.rate}<span>/night</span></div>
      <div class="room-footer">
        <span class="badge ${statusClass}">${r.status}</span>
        <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;" onclick="openRoomEditModal('${r.id}', '${r.number}', '${r.status}', ${r.rate})">Modify</button>
      </div>
    `;
    DOM.roomsGrid.appendChild(card);
  });
}

function renderBookings() {
  DOM.bookingsTable.innerHTML = '';
  
  const searchVal = DOM.searchBookingInput.value.trim().toLowerCase();
  const statusFilter = DOM.filterBookingStatus.value;
  
  let filteredBookings = [...state.bookings];
  
  if (statusFilter) {
    filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
  }
  
  if (searchVal) {
    filteredBookings = filteredBookings.filter(b => 
      b.guestName.toLowerCase().includes(searchVal) ||
      b.guestEmail.toLowerCase().includes(searchVal) ||
      b.id.toLowerCase().includes(searchVal)
    );
  }

  if (filteredBookings.length === 0) {
    DOM.bookingsTable.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No matching reservation bookings found.</td></tr>`;
    return;
  }

  filteredBookings.forEach(b => {
    const room = state.rooms.find(r => r.id === b.roomId);
    const roomNum = room ? room.number : `ID: ${b.roomId}`;
    const tr = document.createElement('tr');
    
    let statusClass = 'badge-pending';
    if (b.status === 'Confirmed') statusClass = 'badge-confirmed';
    if (b.status === 'CheckedIn') statusClass = 'badge-checkedin';
    if (b.status === 'CheckedOut') statusClass = 'badge-checkedout';
    if (b.status === 'Cancelled') statusClass = 'badge-cancelled';

    let actionButtons = '';
    if (b.status === 'Confirmed') {
      actionButtons = `
        <div class="actions-cell">
          <button class="btn-small btn-small-success" onclick="executeStatusUpdate('${b.id}', 'CheckedIn')">Check-In</button>
          <button class="btn-small btn-danger" onclick="executeStatusUpdate('${b.id}', 'Cancelled')">Cancel</button>
        </div>
      `;
    } else if (b.status === 'CheckedIn') {
      actionButtons = `
        <div class="actions-cell">
          <button class="btn-small btn-small-primary" onclick="executeStatusUpdate('${b.id}', 'CheckedOut')">Check-Out</button>
        </div>
      `;
    } else {
      actionButtons = `<span style="color:var(--text-muted); font-size:12px;">No Actions</span>`;
    }

    tr.innerHTML = `
      <td><span style="font-family: monospace; font-size:12px; color: var(--accent-primary);">${b.id.substring(0, 10)}</span></td>
      <td><strong>${b.guestName}</strong></td>
      <td style="font-size: 13px; color: var(--text-secondary);">${b.guestEmail}<br>${b.guestPhone}</td>
      <td><strong>Room ${roomNum}</strong></td>
      <td>${b.checkIn}</td>
      <td>${b.checkOut}</td>
      <td style="font-weight: 700; color: var(--text-primary);">₹${b.totalAmount}</td>
      <td><span class="badge ${statusClass}">${b.status}</span></td>
      <td>${actionButtons}</td>
    `;
    DOM.bookingsTable.appendChild(tr);
  });
}

function updateRoomOptions() {
  DOM.bookingRoomSelect.innerHTML = '<option value="" disabled selected>Select an Available Room</option>';
  
  // Find rooms that are marked "Available"
  const availableRooms = state.rooms.filter(r => r.status === 'Available');
  
  availableRooms.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.dataset.rate = r.rate;
    opt.textContent = `Room ${r.number} (${r.type}) - ₹${r.rate}/night`;
    DOM.bookingRoomSelect.appendChild(opt);
  });
}

// ---------------- ACTION EXECUTORS ----------------

window.executeStatusUpdate = async function(bookingId, status) {
  try {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update reservation status');
    }
    
    showToast(`Booking successfully transited to ${status}!`, 'success');
    refreshData();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// Real-Time Total Bill Estimate Calculator
function calculateEstimate() {
  const roomId = DOM.bookingRoomSelect.value;
  const inDate = DOM.bookingCheckIn.value;
  const outDate = DOM.bookingCheckOut.value;
  
  if (roomId && inDate && outDate) {
    const checkIn = new Date(inDate);
    const checkOut = new Date(outDate);
    
    if (checkOut > checkIn) {
      const selectedOption = DOM.bookingRoomSelect.options[DOM.bookingRoomSelect.selectedIndex];
      const rate = parseFloat(selectedOption.dataset.rate) || 0;
      
      const diffTime = Math.abs(checkOut - checkIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const totalAmount = diffDays * rate;
      DOM.bookingEstimatedPrice.textContent = `₹${totalAmount} (${diffDays} night${diffDays > 1 ? 's' : ''})`;
      DOM.bookingEstimateBox.style.display = 'block';
      return;
    }
  }
  DOM.bookingEstimateBox.style.display = 'none';
}

// ---------------- WINDOW MODAL DRIVERS ----------------

function openBookingModal() {
  DOM.bookingForm.reset();
  DOM.bookingEstimateBox.style.display = 'none';
  
  // Default dates checkIn = tomorrow, checkOut = day after
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDay = new Date();
  nextDay.setDate(tomorrow.getDate() + 1);
  
  DOM.bookingCheckIn.value = tomorrow.toISOString().split('T')[0];
  DOM.bookingCheckOut.value = nextDay.toISOString().split('T')[0];
  
  updateRoomOptions();
  DOM.bookingModal.classList.add('show');
}

function closeBookingModal() {
  DOM.bookingModal.classList.remove('show');
}

window.openRoomEditModal = function(roomId, roomNumber, status, rate) {
  DOM.roomEditId.value = roomId;
  DOM.roomEditNumber.value = `Room ${roomNumber}`;
  DOM.roomEditStatus.value = status;
  DOM.roomEditRate.value = rate;
  DOM.roomEditModal.classList.add('show');
};

function closeRoomEditModal() {
  DOM.roomEditModal.classList.remove('show');
}

// ---------------- TOAST NOTIFICATION ----------------

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.textContent = message;
  
  DOM.toastContainer.appendChild(toast);
  
  // Trigger transition animation
  setTimeout(() => toast.classList.add('show'), 50);
  
  // Cleanup floating toast alert
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---------------- EVENT LISTENERS ----------------

// Setup Sidebar tabs swapping
DOM.navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetView = link.dataset.view;
    switchView(targetView);
  });
});

// Reservation form fields listeners
DOM.bookingRoomSelect.addEventListener('change', calculateEstimate);
DOM.bookingCheckIn.addEventListener('change', calculateEstimate);
DOM.bookingCheckOut.addEventListener('change', calculateEstimate);

// Filter triggers
DOM.filterRoomType.addEventListener('change', renderRooms);
DOM.filterRoomStatus.addEventListener('change', renderRooms);
DOM.searchBookingInput.addEventListener('input', renderBookings);
DOM.filterBookingStatus.addEventListener('change', renderBookings);

// Open Buttons
DOM.openBookingBtn.addEventListener('click', openBookingModal);

// Close Buttons Modal links
DOM.closeBookingBtn.addEventListener('click', closeBookingModal);
DOM.cancelBookingBtn.addEventListener('click', closeBookingModal);
DOM.closeRoomEditBtn.addEventListener('click', closeRoomEditModal);
DOM.cancelRoomEditBtn.addEventListener('click', closeRoomEditModal);

// Submit Reservation
DOM.bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const bookingPayload = {
    roomId: DOM.bookingRoomSelect.value,
    guestName: document.getElementById('guest-name').value.trim(),
    guestEmail: document.getElementById('guest-email').value.trim(),
    guestPhone: document.getElementById('guest-phone').value.trim(),
    checkIn: DOM.bookingCheckIn.value,
    checkOut: DOM.bookingCheckOut.value
  };

  try {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit reservation booking');
    }
    
    showToast(`Reservation successfully made for ${data.guestName}!`, 'success');
    closeBookingModal();
    refreshData();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Save Room modifications status
DOM.roomEditForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const roomId = DOM.roomEditId.value;
  const status = DOM.roomEditStatus.value;
  const rate = parseFloat(DOM.roomEditRate.value);

  try {
    // 1. Submit Rate Change
    const rateRes = await fetch(`${API_URL}/rooms/${roomId}/rate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate })
    });
    
    if (!rateRes.ok) {
      const data = await rateRes.json();
      throw new Error(data.error || 'Failed to update room price rate');
    }
    
    // 2. Submit Status Change
    const statusRes = await fetch(`${API_URL}/rooms/${roomId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (!statusRes.ok) {
      const data = await statusRes.json();
      throw new Error(data.error || 'Failed to update room service status');
    }
    
    showToast('Room settings saved successfully!', 'success');
    closeRoomEditModal();
    refreshData();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// App Startup Bootstrapping
refreshData();
switchView('dashboard');
