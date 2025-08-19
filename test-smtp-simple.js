const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPSimple() {
    console.log('Testing ProtonMail Bridge with minimal config...');
    
    // Try the most basic configuration possible
    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 1025,
        secure: false, // Don't use SSL
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_APP_PASSWORD
        },
        // Disable all TLS/security to see if it's a protocol issue
        ignoreTLS: true,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
    });

    try {
        console.log('Testing connection...');
        const verified = await transporter.verify();
        console.log('✅ Verification result:', verified);
        
        console.log('Sending test email to anudeep.nayak123@gmail.com...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_ADDRESS,
            to: 'anudeep.nayak123@gmail.com',
            subject: 'ProtonMail Bridge Test - Simple Config',
            text: 'Success! ProtonMail Bridge SMTP is working.'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Error code:', error.code);
        console.log('Command:', error.command);
    }
}

testSMTPSimple();