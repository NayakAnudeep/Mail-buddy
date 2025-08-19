const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPStartTLS() {
    console.log('Testing ProtonMail Bridge with STARTTLS...');
    
    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 1025,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_APP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        debug: true,
        logger: true
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection successful!');
        
        console.log('Sending test email to anudeep.nayak123@gmail.com...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_ADDRESS,
            to: 'anudeep.nayak123@gmail.com',
            subject: 'Test Email from ProtonMail Bridge - STARTTLS',
            text: 'This is a test email to verify ProtonMail Bridge SMTP is working with STARTTLS.',
            html: '<p>This is a <strong>test email</strong> to verify ProtonMail Bridge SMTP is working with STARTTLS.</p>'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testSMTPStartTLS();