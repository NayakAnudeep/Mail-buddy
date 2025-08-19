const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPVariations() {
    const variations = [
        {
            name: 'Full email address',
            user: process.env.EMAIL_ADDRESS
        },
        {
            name: 'Username only',
            user: process.env.EMAIL_ADDRESS.split('@')[0]
        }
    ];

    for (const variation of variations) {
        console.log(`\n=== Testing ${variation.name}: ${variation.user} ===`);
        
        const transporter = nodemailer.createTransport({
            host: '127.0.0.1',
            port: 1025,
            secure: false,
            auth: {
                user: variation.user,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000
        });

        try {
            console.log('Verifying connection...');
            await transporter.verify();
            console.log('✅ Connection successful!');
            
            console.log('Sending test email...');
            const info = await transporter.sendMail({
                from: process.env.EMAIL_ADDRESS,
                to: 'anudeep.nayak123@gmail.com',
                subject: 'Test from ProtonMail Bridge',
                text: 'This is a test email to verify ProtonMail Bridge SMTP is working.'
            });
            
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', info.messageId);
            break; // Exit loop on success
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }
}

testSMTPVariations();