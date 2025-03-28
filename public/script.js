
// Advanced screenshot protection
let isVisible = true;

function hideContent() {
  if (isVisible) {
    document.body.style.backgroundColor = '#000';
    document.body.style.color = '#000';
    document.querySelector('.chat-container').style.display = 'none';
    isVisible = false;
    
    setTimeout(() => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.querySelector('.chat-container').style.display = 'flex';
      isVisible = true;
    }, 1000);
  }
}

// Detect various screenshot attempts
document.addEventListener('keyup', (e) => {
  if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
    e.preventDefault();
    hideContent();
    return false;
  }
});

// Detect clipboard operations
document.addEventListener('copy', (e) => {
  e.preventDefault();
  hideContent();
});

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  hideContent();
});

// Detect keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'c' || e.key === 's' || e.key === 'u' || e.key === 'p')) {
    e.preventDefault();
    hideContent();
    return false;
  }
});

// Additional screenshot detection
window.addEventListener('beforeprint', (e) => {
  e.preventDefault();
  hideContent();
});

// Detect screen capture API
if (navigator.mediaDevices) {
  navigator.mediaDevices.getDisplayMedia = async () => {
    hideContent();
    throw new Error('Screen capture is not allowed');
  };
}

let username = '';
const socket = io({
  transports: ['websocket'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const nameDialog = document.getElementById('name-dialog');
const chatContainer = document.querySelector('.chat-container');
const joinTimeSpan = document.getElementById('join-time');
const joinedUsersDiv = document.getElementById('joined-users');

function updateJoinedUsers(users) {
  joinedUsersDiv.innerHTML = users.map(user => 
    `${user.username} joined at ${user.time}`
  ).join('<br>');
}

function joinChat() {
  username = document.getElementById('username-input').value.trim();
  const password = document.getElementById('password-input').value;
  
  if (username && password === '@PkpX12') {
    nameDialog.style.display = 'none';
    chatContainer.style.display = 'flex';
    const joinTime = new Date();
    joinTimeSpan.textContent = `Joined at ${joinTime.toLocaleTimeString()}`;
    socket.emit('user-joined', { username, time: joinTime.toLocaleTimeString() });
  } else if (username && password !== '@PkpX12') {
    alert('Incorrect password!');
    document.getElementById('password-input').value = '';
  }
}

socket.on('previous-messages', (messages) => {
  messages.forEach(message => addMessage(message));
});

socket.on('chat-message', (message) => {
  addMessage(message);
});



messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const messageText = messageInput.value.trim();
  if (messageText) {
    const messageData = { text: messageText, username };
    if (messageInput.dataset.replyTo) {
      messageData.replyTo = JSON.parse(messageInput.dataset.replyTo);
      delete messageInput.dataset.replyTo;
      messageInput.placeholder = 'Type a message...';
    }
    socket.emit('chat-message', messageData);
    messageInput.value = '';
  }
});

function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  const sanitized = div.innerHTML
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/onload=/gi, '');
  return sanitized.slice(0, 1000); // Limit length
}

function validateInput(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.length > 1000) return false;
  if (/[<>{}$]/.test(input)) return false;
  return true;
}

function addMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.dataset.id = message.id;
  const safeUsername = sanitizeHTML(message.username);
  const safeText = sanitizeHTML(message.text);
  const imageHtml = message.imagePath ? `
    <div class="image-container">
      <img src="${message.imagePath}" alt="Uploaded image">
      <a href="${message.imagePath}" download class="download-btn" title="Download image">⬇️</a>
    </div>
  ` : '';
  const replyToText = message.replyTo ? `<div class="reply-to">${sanitizeHTML(message.replyTo.username)}: ${sanitizeHTML(message.replyTo.text)}</div>` : '';
  
  messageElement.innerHTML = `
    ${replyToText}
    <div class="message-header">
      <span class="username">${safeUsername}</span>
      <span class="message-time">${new Date(message.time).toLocaleTimeString()}</span>
    </div>
    <div class="message-text">${safeText}</div>
    ${imageHtml}
    <div class="message-actions">
      ${message.username === username ? '<button class="delete-btn">Delete</button>' : ''}
      <button class="reply-btn">Reply</button>
    </div>
  `;
  
  if (message.username === username) {
    messageElement.querySelector('.delete-btn').addEventListener('click', () => {
      socket.emit('delete-message', message.id);
      messageElement.remove();
    });
  }

  messageElement.querySelector('.reply-btn').addEventListener('click', () => {
    const replyTo = {
      id: message.id,
      username: message.username,
      text: message.text
    };
    messageInput.dataset.replyTo = JSON.stringify(replyTo);
    messageInput.placeholder = `Replying to ${message.username}...`;
    messageInput.focus();
  });
  
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.on('message-deleted', (messageId) => {
  const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
  if (messageElement) {
    messageElement.remove();
  }
});

socket.on('joined-users', (users) => {
  updateJoinedUsers(users);
});

socket.on('user-joined', (user) => {
  const users = Array.from(document.querySelectorAll('.joined-users div'))
    .map(div => ({
      username: div.textContent.split(' joined at ')[0],
      time: div.textContent.split(' joined at ')[1]
    }));
  users.push(user);
  updateJoinedUsers(users);
});

socket.on('online-users', (count) => {
  document.getElementById('online-users').textContent = `Online users: ${count}`;
});

socket.on('all-cleared', () => {
  messagesDiv.innerHTML = '';
});

const clearDialog = document.getElementById('clear-dialog');
const typingIndicator = document.getElementById('typing-indicator');
let typingTimeout;

document.getElementById('clear-all').addEventListener('click', () => {
  clearDialog.style.display = 'block';
});

document.getElementById('cancel-clear').addEventListener('click', () => {
  clearDialog.style.display = 'none';
});

document.getElementById('confirm-clear').addEventListener('click', () => {
  const password = document.getElementById('clear-password').value;
  if (password) {
    socket.emit('clear-all', password);
    clearDialog.style.display = 'none';
    document.getElementById('clear-password').value = '';
  }
});

messageInput.addEventListener('input', () => {
  socket.emit('typing', username);
});

socket.on('user-typing', (typingUser) => {
  if (typingUser !== username) {
    typingIndicator.textContent = `${typingUser} is typing...`;
    typingIndicator.style.display = 'block';
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 2000);
  }
});


