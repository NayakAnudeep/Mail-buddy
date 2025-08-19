const nodemailer = require('nodemailer');
require('dotenv').config();

async function testDirectSSL() {
    console.log('Testing ProtonMail Bridge with direct SSL on port 1025...');
    
    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 1025,
        secure: true,  // Direct SSL from connection start
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
        console.log('Verifying SSL connection...');
        await transporter.verify();
        console.log('✅ SSL connection successful!');
        
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_ADDRESS,
            to: 'anudeep.nayak123@gmail.com',
            subject: 'ProtonMail Bridge SSL Test',
            text: 'Success! ProtonMail Bridge is working with direct SSL on port 1025.'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.log('❌ SSL Error:', error.message);
        console.log('Error code:', error.code);
    }
}

testDirectSSL();