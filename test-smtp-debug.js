const net = require('net');

console.log('Testing raw TCP connection to ProtonMail Bridge...');

const client = new net.Socket();
client.setTimeout(5000);

client.connect(1025, '127.0.0.1', function() {
    console.log('✅ TCP connection established!');
    console.log('Waiting for SMTP greeting...');
});

client.on('data', function(data) {
    console.log('📩 Received:', data.toString());
    client.destroy();
});

client.on('timeout', function() {
    console.log('❌ Connection timeout');
    client.destroy();
});

client.on('error', function(err) {
    console.log('❌ Connection error:', err.message);
});

client.on('close', function() {
    console.log('🔌 Connection closed');
});