const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
    console.log('Testing ProtonMail Bridge SMTP connection...');
    console.log('Email:', process.env.EMAIL_ADDRESS);
    console.log('Password length:', process.env.EMAIL_APP_PASSWORD?.length);
    
    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 1025,
        secure: false,
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_APP_PASSWORD
        },
        debug: true,
        logger: true
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_ADDRESS,
            to: 'anudeep.nayak123@gmail.com',
            subject: 'Test Email from ProtonMail Bridge',
            text: 'This is a test email to verify ProtonMail Bridge SMTP is working.'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Full error:', error);
    }
}

testSMTP();