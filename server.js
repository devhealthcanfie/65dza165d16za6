const http = require('http');
const { spawn } = require('child_process');

// Simple web server to handle HTTP requests
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft AFK Bot is running!\n');
});

const PORT = process.env.PORT || 3000;

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
  console.log('🌐 Health checks will now work');
  
  // Start your bot
  console.log('🎮 Starting Minecraft AFK Bot...');
  require('./bot.js');
});
