const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');

// Security middleware
app.use(helmet());
app.use(xss());
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.static('public'));

const messages = [];
const MESSAGE_LIMIT = 1000;

// Cleanup old messages periodically
setInterval(() => {
  if (messages.length > MESSAGE_LIMIT) {
    messages.splice(0, messages.length - MESSAGE_LIMIT);
  }
}, 60000);

io.on('connection', (socket) => {
  onlineUsers.add(socket.id);
  io.emit('online-users', Array.from(onlineUsers).length);
  socket.emit('joined-users', joinedUsers);
  socket.emit('previous-messages', messages);

  socket.on('user-joined', (userData) => {
    socket.username = userData.username;
    joinedUsers.push({
      username: userData.username,
      time: userData.time
    });
    io.emit('user-joined', {
      username: userData.username,
      time: userData.time
    });
  });

  socket.on('chat-message', (data) => {
    const message = {
      text: data.text,
      username: data.username,
      time: new Date().toISOString(),
      id: Date.now(),
      replyTo: data.replyTo
    };
    messages.push(message);
    io.emit('chat-message', message);
  });

  socket.on('delete-message', (messageId) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages.splice(index, 1);
      io.emit('message-deleted', messageId);
    }
  });

  socket.on('clear-all', (password) => {
    if (password === CLEAR_PASSWORD) {
      messages.length = 0;
      io.emit('all-cleared');
    }
  });

  socket.on('typing', (username) => {
    socket.broadcast.emit('user-typing', username);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online-users', Array.from(onlineUsers).length);
  });
});

const joinedUsers = [];
const onlineUsers = new Set();
const CLEAR_PASSWORD = '@Pkp12';

http.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});