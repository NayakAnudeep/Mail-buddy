const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Check resume files endpoint
app.get('/api/resumes/status', (req, res) => {
    try {
        const softwareResumePath = path.join(__dirname, 'resumes', 'anudeep_swp.pdf');
        const dataScienceResumePath = path.join(__dirname, 'resumes', 'anudeep_dsp.pdf');
        
        const softwareExists = fs.existsSync(softwareResumePath);
        const dataScienceExists = fs.existsSync(dataScienceResumePath);
        
        res.json({
            software: {
                exists: softwareExists,
                path: softwareExists ? 'resumes/anudeep_swp.pdf' : null,
                size: softwareExists ? fs.statSync(softwareResumePath).size : null
            },
            dataScience: {
                exists: dataScienceExists,
                path: dataScienceExists ? 'resumes/anudeep_dsp.pdf' : null,
                size: dataScienceExists ? fs.statSync(dataScienceResumePath).size : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check resume files: ' + error.message });
    }
});

// Environment configuration endpoint
app.get('/api/config', (req, res) => {
    try {
        const aiProvider = process.env.AI_PROVIDER || 'claude';
        let hasAIKey = false;
        
        switch(aiProvider) {
            case 'claude':
                hasAIKey = !!process.env.CLAUDE_API_KEY;
                break;
            case 'openai':
                hasAIKey = !!process.env.OPENAI_API_KEY;
                break;
            case 'gemini':
                hasAIKey = !!process.env.GEMINI_API_KEY;
                break;
        }
        
        res.json({
            hasAIKey: hasAIKey,
            aiProvider: aiProvider,
            hasEmailConfig: !!(process.env.EMAIL_ADDRESS && process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_PROVIDER),
            emailProvider: process.env.EMAIL_PROVIDER || 'gmail',
            emailAddress: process.env.EMAIL_ADDRESS || '',
            defaultResumeType: process.env.DEFAULT_RESUME_TYPE || 'software',
            maxRecipients: parseInt(process.env.MAX_RECIPIENTS_PER_BATCH) || 1000,
            rateLimit: parseInt(process.env.RATE_LIMIT_DELAY) || 1000
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load configuration: ' + error.message });
    }
});

// AI email generation endpoint (now simplified - just returns the draft message)
app.post('/api/generate-email', async (req, res) => {
    try {
        const { jobTitle, companyName, draftMessage } = req.body;
        
        if (!jobTitle || !companyName || !draftMessage) {
            return res.status(400).json({ error: 'Missing required fields: jobTitle, companyName, draftMessage' });
        }
        
        // Simply return the draft message with signature added
        const emailSignature = process.env.EMAIL_SIGNATURE || 'Best regards,\nAnu';
        let emailContent = draftMessage;
        
        if (!emailContent.includes('Best regards') && !emailContent.includes('Sincerely')) {
            emailContent += '\n\n' + emailSignature;
        }
        
        res.json({ 
            success: true, 
            emailContent: emailContent,
            provider: 'template' 
        });
        
    } catch (error) {
        console.error('Error processing template:', error);
        res.status(500).json({ error: 'Failed to process template: ' + error.message });
    }
});

// Craft variations endpoint
app.post('/api/craft-variations', async (req, res) => {
    try {
        const { baseMessage, jobTitle, companyName, count } = req.body;
        
        if (!baseMessage) {
            return res.status(400).json({ error: 'Missing required field: baseMessage' });
        }
        
        const aiProvider = process.env.AI_PROVIDER || 'claude';
        const prompt = buildVariationPrompt(baseMessage, jobTitle, companyName, count || 10);
        
        let variations;
        switch(aiProvider) {
            case 'claude':
                const aiResponse = await callClaudeAPI(prompt);
                variations = parseVariationsFromResponse(aiResponse, baseMessage);
                break;
            case 'openai':
                const openaiResponse = await callOpenAIAPI(prompt);
                variations = parseVariationsFromResponse(openaiResponse, baseMessage);
                break;
            case 'gemini':
                const geminiResponse = await callGeminiAPI(prompt);
                variations = parseVariationsFromResponse(geminiResponse, baseMessage);
                break;
            default:
                throw new Error(`Unsupported AI provider: ${aiProvider}`);
        }
        
        res.json({ 
            success: true, 
            variations: variations,
            provider: aiProvider,
            count: variations.length
        });
        
    } catch (error) {
        console.error('Error crafting variations:', error);
        res.status(500).json({ error: 'Failed to craft variations: ' + error.message });
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Email draft creation endpoint
app.post('/api/create-drafts', async (req, res) => {
    try {
        const { recipients, draftMessage, variations, jobTitle, companyName } = req.body;
        
        // Use environment variables for email credentials
        const emailAddress = process.env.EMAIL_ADDRESS;
        const emailPassword = process.env.EMAIL_APP_PASSWORD;
        const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
        
        
        if (!emailAddress || !emailPassword) {
            return res.status(400).json({ 
                error: `Email credentials not configured in environment variables. Please check .env file for ${emailProvider.toUpperCase()} settings.` 
            });
        }

        if (!recipients || (!draftMessage && (!variations || variations.length === 0))) {
            return res.status(400).json({ error: 'Missing required fields: recipients and either draftMessage or variations' });
        }

        // Apply rate limiting from environment
        const rateLimit = parseInt(process.env.RATE_LIMIT_DELAY) || 1000;
        const maxBatch = parseInt(process.env.MAX_RECIPIENTS_PER_BATCH) || 1000;
        
        if (recipients.length > maxBatch) {
            return res.status(400).json({ 
                error: `Too many recipients. Maximum ${maxBatch} per batch.` 
            });
        }

        const results = [];

        // For ProtonMail, create draft files locally since SMTP doesn't support draft creation
        if (emailProvider === 'protonmail') {
            
            // Create drafts directory if it doesn't exist
            const draftsDir = './drafts';
            if (!fs.existsSync(draftsDir)) {
                fs.mkdirSync(draftsDir);
            }

            // Get the appropriate resume file
            const resumeType = process.env.DEFAULT_RESUME_TYPE || 'software';
            const resumeFileName = resumeType === 'datascience' ? 'anudeep_dsp.pdf' : 'anudeep_swp.pdf';
            const resumePath = path.join(__dirname, 'resumes', resumeFileName);
            

            for (const recipient of recipients) {
                try {
                    // Use the already personalized content from frontend
                    const personalizedContent = {
                        subject: recipient.subject,
                        body: recipient.personalizedEmail
                    };
                    
                    // Create comprehensive draft instructions for Apple Mail
                    const draftInstructions = `APPLE MAIL IMPORT INSTRUCTIONS:
=================================

1. TO IMPORT TO APPLE MAIL:
   - Open Apple Mail
   - Go to File → Import Mailboxes
   - Choose "Files in mbox format"
   - Select this .eml file
   - It will appear in your Apple Mail

2. TO MOVE TO PROTONMAIL DRAFTS:
   - In Apple Mail, find the imported email
   - Drag it to your ProtonMail Drafts folder
   - Edit and add attachments as needed

3. RESUME TO ATTACH:
   - File: ${resumeFileName}
   - Location: /Users/anudeepn/Documents/email-automation-system/resumes/${resumeFileName}

4. PORTFOLIO LINK INCLUDED:
   - ${process.env.PORTFOLIO_URL || 'https://anudeepnayak.dev/'}

=================================

To: ${recipient.email}
From: ${emailAddress}
Subject: ${personalizedContent.subject}

${personalizedContent.body}

=================================
ATTACH RESUME: ${resumeFileName}
PORTFOLIO: ${process.env.PORTFOLIO_URL || 'https://anudeepnayak.dev/'}
=================================`;

                    // Save as .eml file with enhanced content
                    const fileName = `draft_${recipient.first_name}_${recipient.last_name}_${Date.now()}.eml`;
                    const filePath = path.join(draftsDir, fileName);
                    
                    fs.writeFileSync(filePath, draftInstructions);
                    
                    results.push({
                        recipient: recipient.email,
                        status: 'success',
                        message: `Enhanced draft created: ${fileName}`,
                        filePath: filePath,
                        resumeFile: resumeFileName,
                        portfolio: process.env.PORTFOLIO_URL || 'https://anudeepnayak.dev/'
                    });

                    // Add delay to prevent overwhelming the system
                    await delay(rateLimit);

                } catch (error) {
                    results.push({
                        recipient: recipient.email,
                        status: 'error',
                        message: error.message
                    });
                }
            }

            // Provide instructions for manual upload
            const instructionsPath = path.join(draftsDir, 'INSTRUCTIONS.md');
            const instructions = `# ProtonMail Draft Instructions\n\n## How to use these draft files:\n\n1. **Option A: Copy & Paste (Recommended)**\n   - Open each .eml file in a text editor\n   - Copy the email content (everything after "Subject:")\n   - Go to ProtonMail → Compose\n   - Paste the content and edit as needed\n   - Save as draft\n\n2. **Option B: Import to Email Client**\n   - Use an email client like Thunderbird or Apple Mail\n   - Import these .eml files\n   - Forward/copy to ProtonMail\n\n## Generated Files:\n${results.filter(r => r.status === 'success').map(r => `- ${path.basename(r.filePath)}`).join('\n')}\n\n## Next Steps:\n1. Review each draft file\n2. Customize as needed\n3. Manually create drafts in ProtonMail\n4. Send when ready\n\nGenerated: ${new Date().toLocaleString()}\n`;

            fs.writeFileSync(instructionsPath, instructions);

        } else {
            // For Gmail/Outlook, use the original SMTP approach
            
            const smtpConfig = getEmailConfig(emailProvider);
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: {
                    user: emailAddress,
                    pass: emailPassword
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            for (const recipient of recipients) {
                try {
                    // Use the already personalized content from frontend
                    const personalizedContent = {
                        subject: recipient.subject,
                        body: recipient.personalizedEmail
                    };
                    
                    // For Gmail, save to drafts folder
                    const mailOptions = {
                        from: emailAddress,
                        to: emailAddress, // Send to self
                        subject: `DRAFT: ${personalizedContent.subject}`,
                        text: `TO: ${recipient.email}\nSUBJECT: ${personalizedContent.subject}\n\n${personalizedContent.body}`,
                        html: `
                            <div style="background: #f0f0f0; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                                <h3 style="color: #333; margin: 0 0 10px 0;">📧 DRAFT EMAIL</h3>
                                <p style="margin: 5px 0;"><strong>To:</strong> ${recipient.email}</p>
                                <p style="margin: 5px 0;"><strong>Subject:</strong> ${personalizedContent.subject}</p>
                            </div>
                            <div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6;">${personalizedContent.body}</div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    
                    results.push({
                        recipient: recipient.email,
                        status: 'success',
                        message: 'Draft created successfully'
                    });

                    await delay(rateLimit);

                } catch (error) {
                    results.push({
                        recipient: recipient.email,
                        status: 'error',
                        message: error.message
                    });
                }
            }
        }

        res.json({
            success: true,
            results: results,
            totalProcessed: recipients.length,
            provider: emailProvider,
            message: emailProvider === 'protonmail' 
                ? 'Draft files created successfully. Check ./drafts/ folder for instructions.'
                : 'Drafts created successfully in your email account.'
        });

    } catch (error) {
        console.error('Error creating drafts:', error);
        res.status(500).json({ error: 'Failed to create drafts: ' + error.message });
    }
});

// Email preview endpoint (shows each email for review)
app.post('/api/preview-emails', async (req, res) => {
    try {
        const { recipients, draftMessage, variations, subjectVariations, jobTitle, companyName, resumeSelection } = req.body;
        
        if (!recipients || (!draftMessage && (!variations || variations.length === 0))) {
            return res.status(400).json({ error: 'Missing required fields: recipients and either draftMessage or variations' });
        }

        const emailPreviews = [];
        
        // Get the appropriate resume file info based on selection
        const resumeInfo = getResumeInfo(resumeSelection);
        const resumeExists = resumeInfo.exists;
        const resumeFileName = resumeInfo.fileName;
        
        // Use the pre-processed data from frontend
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            
            emailPreviews.push({
                id: i,
                recipient: {
                    email: recipient.email,
                    firstName: recipient.first_name,
                    lastName: recipient.last_name,
                    position: recipient.position
                },
                subject: recipient.subject, // Already personalized from frontend
                body: recipient.personalizedEmail, // Already personalized from frontend
                resumeFile: resumeFileName,
                resumeExists: resumeExists,
                portfolio: 'https://anudeepnayak.dev/',
                variationUsed: recipient.variationUsed
            });
        }
        
        res.json({
            success: true,
            emailPreviews: emailPreviews,
            totalEmails: emailPreviews.length,
            resumeInfo: {
                fileName: resumeFileName,
                exists: resumeExists,
                path: resumeExists ? `/resumes/${resumeFileName}` : null
            }
        });
        
    } catch (error) {
        console.error('Error creating email previews:', error);
        res.status(500).json({ error: 'Failed to create email previews: ' + error.message });
    }
});

// Send single email endpoint
app.post('/api/send-single-email', async (req, res) => {
    try {
        const { recipient, subject, body, resumeSelection } = req.body;
        
        // Use environment variables for email credentials
        const emailAddress = process.env.EMAIL_ADDRESS;
        const emailPassword = process.env.EMAIL_APP_PASSWORD;
        const emailProvider = process.env.EMAIL_PROVIDER || 'protonmail';
        
        if (!emailAddress || !emailPassword) {
            return res.status(400).json({ 
                error: `Email credentials not configured in environment variables.` 
            });
        }

        if (!recipient || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields: recipient, subject, body' });
        }

        // Configure email SMTP
        const smtpConfig = getEmailConfig(emailProvider);
        const transporter = nodemailer.createTransport({
            ...smtpConfig,
            auth: {
                user: emailAddress,
                pass: emailPassword
            }
        });
        
        // Get the appropriate resume file based on selection
        const resumeInfo = getResumeInfo(resumeSelection);
        const resumePath = resumeInfo.path;
        const resumeFileName = resumeInfo.fileName;
        const resumeExists = resumeInfo.exists;
        
        // Create email with attachment
        const mailOptions = {
            from: emailAddress,
            to: recipient,
            subject: subject,
            text: body,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; white-space: pre-wrap;">${body}</div>`,
            attachments: resumeExists && resumePath ? [{
                filename: resumeFileName,
                path: resumePath
            }] : []
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Email sent to: ${recipient}`);
        
        res.json({
            success: true,
            message: `Email sent successfully to ${recipient}`,
            timestamp: new Date().toLocaleTimeString(),
            resumeAttached: resumeExists,
            portfolio: process.env.PORTFOLIO_URL || 'https://anudeepnayak.dev/'
        });
        
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send email: ' + error.message 
        });
    }
});

// File upload endpoint
app.post('/api/upload', upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'csv', maxCount: 1 }
]), (req, res) => {
    try {
        const files = req.files;
        const response = {};

        if (files.resume) {
            response.resume = {
                filename: files.resume[0].filename,
                path: files.resume[0].path,
                size: files.resume[0].size
            };
        }

        if (files.csv) {
            response.csv = {
                filename: files.csv[0].filename,
                path: files.csv[0].path,
                size: files.csv[0].size
            };
        }

        res.json({ success: true, files: response });
    } catch (error) {
        res.status(500).json({ error: 'File upload failed: ' + error.message });
    }
});

// Template management endpoints
app.get('/api/templates', (req, res) => {
    try {
        const templatesPath = './templates.json';
        if (fs.existsSync(templatesPath)) {
            const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
            res.json(templates);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load templates: ' + error.message });
    }
});

app.post('/api/templates', (req, res) => {
    try {
        const { templates } = req.body;
        fs.writeFileSync('./templates.json', JSON.stringify(templates, null, 2));
        res.json({ success: true, message: 'Templates saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save templates: ' + error.message });
    }
});

// Utility functions
function buildVariationPrompt(baseMessage, jobTitle, companyName, count) {
    const prompt = `Create ${count} variations of the following email message while maintaining the same professional tone, intent, and key information. Each variation should:

1. Keep the same core message and request
2. Maintain professional tone
3. Use different wording and sentence structures
4. Keep all placeholder tags exactly as they are: [Your name], [First Name], [Company Name], [Job Title], [Position]
5. Ensure each variation feels natural and authentic
6. Vary the opening, middle, and closing phrases
7. Keep the same length (2-3 paragraphs)

Original message:
"${baseMessage}"

Job context:
- Job Title: ${jobTitle || 'Not specified'}
- Company: ${companyName || 'Not specified'}

Please provide exactly ${count} variations, each separated by "---VARIATION---" and numbered (1, 2, 3, etc.).

Example format:
1. [First variation here]
---VARIATION---
2. [Second variation here]
---VARIATION---
[etc.]`;
    
    return prompt;
}

function parseVariationsFromResponse(response, baseMessage) {
    try {
        // Include the original as the first variation
        const variations = [baseMessage];
        
        // Split by the separator and extract numbered variations
        const parts = response.split('---VARIATION---');
        
        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed && trimmed !== baseMessage) {
                // Remove numbering (1., 2., etc.) from the beginning
                const cleaned = trimmed.replace(/^\d+\.\s*/, '').trim();
                if (cleaned && cleaned.length > 50) { // Ensure it's substantial
                    variations.push(cleaned);
                }
            }
        });
        
        // If parsing failed, try simple line-based splitting
        if (variations.length < 3) {
            const lines = response.split('\n\n');
            lines.forEach(line => {
                const cleaned = line.replace(/^\d+\.\s*/, '').trim();
                if (cleaned && cleaned.length > 50 && !variations.includes(cleaned)) {
                    variations.push(cleaned);
                }
            });
        }
        
        // Ensure we have at least 5 variations (including original)
        while (variations.length < 5) {
            variations.push(baseMessage);
        }
        
        // Limit to 10 variations max
        return variations.slice(0, 10);
        
    } catch (error) {
        console.error('Error parsing variations:', error);
        // Return original message multiple times as fallback
        return Array(10).fill(baseMessage);
    }
}

async function callClaudeAPI(prompt) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }
    
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: process.env.AI_MODEL === 'auto' ? 'claude-3-5-sonnet-20241022' : process.env.AI_MODEL,
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Claude API error: ${res.statusCode} ${res.statusMessage} - ${responseData}`));
                        return;
                    }
                    
                    const parsed = JSON.parse(responseData);
                    resolve(parsed.content[0].text);
                } catch (error) {
                    reject(new Error(`Failed to parse Claude API response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Claude API request failed: ${error.message}`));
        });
        
        req.write(data);
        req.end();
    });
}

async function callOpenAIAPI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API key not configured');
    }
    
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: process.env.AI_MODEL === 'auto' ? 'gpt-4' : process.env.AI_MODEL,
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        reject(new Error(`OpenAI API error: ${res.statusCode} ${res.statusMessage}`));
                        return;
                    }
                    
                    const parsed = JSON.parse(responseData);
                    resolve(parsed.choices[0].message.content);
                } catch (error) {
                    reject(new Error(`Failed to parse OpenAI API response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`OpenAI API request failed: ${error.message}`));
        });
        
        req.write(data);
        req.end();
    });
}

async function callGeminiAPI(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }
    
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: process.env.AI_MODEL === 'auto' ? 'gemini-pro' : process.env.AI_MODEL,
        generationConfig: {
            maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
        }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

function getEmailConfig(provider) {
    const configs = {
        gmail: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false
        },
        outlook: {
            host: 'smtp.live.com',
            port: 587,
            secure: false
        },
        protonmail: {
            // ProtonMail Bridge (paid accounts only)
            // Make sure ProtonMail Bridge is running
            host: '127.0.0.1',
            port: 1025,
            secure: true, // Use SSL/TLS
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        }
    };
    
    return configs[provider] || configs.gmail;
}

function personalizeEmail(template, recipient, subjectTemplate, jobTitle, companyName) {
    const yourName = process.env.YOUR_NAME || 'Anu';
    const emailSignature = process.env.EMAIL_SIGNATURE || `Best regards,\n${yourName}`;
    const portfolioUrl = process.env.PORTFOLIO_URL || 'https://anudeepnayak.dev/';
    
    const personalizedBody = template
        .replace(/\[Your name\]/g, yourName)
        .replace(/\[First Name\]/g, recipient.first_name)
        .replace(/\[Last Name\]/g, recipient.last_name)
        .replace(/\[Position\]/g, recipient.position)
        .replace(/\[Job Title\]/g, jobTitle || '')
        .replace(/\[Company Name\]/g, companyName || '')
        .replace(/Best regards,\s*\[Your name\]/g, emailSignature);

    // Add portfolio URL after the signature
    const bodyWithPortfolio = personalizedBody + `\n\nPortfolio: ${portfolioUrl}`;

    const personalizedSubject = subjectTemplate
        .replace(/\[Your name\]/g, yourName)
        .replace(/\[First Name\]/g, recipient.first_name)
        .replace(/\[Last Name\]/g, recipient.last_name)
        .replace(/\[Job Title\]/g, jobTitle || '')
        .replace(/\[Company Name\]/g, companyName || '')
        .replace(/\[Position\]/g, recipient.position);

    return {
        subject: personalizedSubject,
        body: bodyWithPortfolio
    };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getResumeInfo(resumeSelection) {
    if (!resumeSelection) {
        // Default behavior
        const resumeType = process.env.DEFAULT_RESUME_TYPE || 'software';
        const resumeFileName = resumeType === 'datascience' ? 'anudeep_dsp.pdf' : 'anudeep_swp.pdf';
        const resumePath = path.join(__dirname, 'resumes', resumeFileName);
        return {
            fileName: resumeFileName,
            path: resumePath,
            exists: fs.existsSync(resumePath),
            type: resumeType
        };
    }
    
    switch(resumeSelection.type) {
        case 'auto':
            // Auto-detect based on role
            const autoType = resumeSelection.detectedRole === 'datascience' ? 'datascience' : 'software';
            const autoFileName = autoType === 'datascience' ? 'anudeep_dsp.pdf' : 'anudeep_swp.pdf';
            const autoPath = path.join(__dirname, 'resumes', autoFileName);
            return {
                fileName: autoFileName,
                path: autoPath,
                exists: fs.existsSync(autoPath),
                type: autoType
            };
            
        case 'software':
            const softwarePath = path.join(__dirname, 'resumes', 'anudeep_swp.pdf');
            return {
                fileName: 'anudeep_swp.pdf',
                path: softwarePath,
                exists: fs.existsSync(softwarePath),
                type: 'software'
            };
            
        case 'datascience':
            const dataSciencePath = path.join(__dirname, 'resumes', 'anudeep_dsp.pdf');
            return {
                fileName: 'anudeep_dsp.pdf',
                path: dataSciencePath,
                exists: fs.existsSync(dataSciencePath),
                type: 'datascience'
            };
            
        case 'custom':
            // Handle custom file upload
            if (resumeSelection.customFile) {
                return {
                    fileName: resumeSelection.customFile.name,
                    path: null, // Will be handled differently
                    exists: true,
                    type: 'custom',
                    customFile: resumeSelection.customFile
                };
            }
            return {
                fileName: null,
                path: null,
                exists: false,
                type: 'custom'
            };
            
        case 'none':
            return {
                fileName: null,
                path: null,
                exists: false,
                type: 'none'
            };
            
        default:
            // Fallback to default
            const defaultType = process.env.DEFAULT_RESUME_TYPE || 'software';
            const defaultFileName = defaultType === 'datascience' ? 'anudeep_dsp.pdf' : 'anudeep_swp.pdf';
            const defaultPath = path.join(__dirname, 'resumes', defaultFileName);
            return {
                fileName: defaultFileName,
                path: defaultPath,
                exists: fs.existsSync(defaultPath),
                type: defaultType
            };
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Email Automation System running on http://localhost:${PORT}`);
    console.log(`📧 Ready to automate your job application emails!`);
});

module.exports = app;