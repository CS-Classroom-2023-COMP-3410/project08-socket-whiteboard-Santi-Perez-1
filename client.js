document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('whiteboard');
  const context = canvas.getContext('2d');
  const colorInput = document.getElementById('color-input');
  const brushSizeInput = document.getElementById('brush-size');
  const brushSizeDisplay = document.getElementById('brush-size-display');
  const clearButton = document.getElementById('clear-button');
  const connectionStatus = document.getElementById('connection-status');
  const userCount = document.getElementById('user-count');

  // Store current board state locally
  let boardState = [];

  function resizeCanvas() {
    // Set canvas width and height based on its parent element
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    // Redraw canvas with the current board state when resized
    redrawCanvas(boardState);
  }

  // Initialize canvas size
  resizeCanvas();

  // Handle window resize
  window.addEventListener('resize', resizeCanvas);

  // Drawing variables
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Connect to Socket.IO server
  const socket = io('http://localhost:3000');

  // Socket.IO event handlers
  socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.add('connected');
  });

  socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('connected');
  });

  socket.on('currentUsers', (count) => {
    userCount.textContent = String(count);
  });

  socket.on('boardState', (state) => {
    boardState = Array.isArray(state) ? state : [];
    redrawCanvas(boardState);
  });

  // Draw only when receiving events from the server
  socket.on('draw', (drawData) => {
    // keep local state in sync
    boardState.push(drawData);
    drawLine(drawData.x0, drawData.y0, drawData.x1, drawData.y1, drawData.color, drawData.size);
  });

  socket.on('clear', () => {
    boardState = [];
    redrawCanvas(boardState);
  });

  // Canvas event handlers (mouse)
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);


  // Clear button event handler
  clearButton.addEventListener('click', clearCanvas);

  // Update brush size display
  brushSizeInput.addEventListener('input', () => {
    brushSizeDisplay.textContent = brushSizeInput.value;
  });

  function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoordinates(e);
    lastX = x;
    lastY = y;
  }

  function draw(e) {
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);

    const drawData = {
      x0: lastX,
      y0: lastY,
      x1: x,
      y1: y,
      color: colorInput.value,
      size: Number(brushSizeInput.value)
    };

    // Send drawing data to server
    socket.emit('draw', drawData);

    // Update last position
    lastX = x;
    lastY = y;
  }

  function drawLine(x0, y0, x1, y1, color, size) {
    context.strokeStyle = color;
    context.lineWidth = size;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();
    context.closePath();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function clearCanvas() {
    socket.emit('clear');
  }

  function redrawCanvas(state = []) {
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all lines from the board state
    for (const item of state) {
      drawLine(item.x0, item.y0, item.x1, item.y1, item.color, item.size);
    }
  }

  // Helper function to get coordinates from mouse or touch event
  function getCoordinates(e) {
    if (e.touches && e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    if (e.changedTouches && e.changedTouches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.changedTouches[0].clientX - rect.left,
        y: e.changedTouches[0].clientY - rect.top
      };
    }

    // Mouse events
    return { x: e.offsetX, y: e.offsetY };
  }

  // Handle touch events
  function handleTouchStart(e) {
    e.preventDefault();
    startDrawing(e);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    draw(e);
  }
});