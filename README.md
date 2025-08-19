# Email Automation System

AI-powered email automation for job applications with Claude API integration.

## Features

- 🤖 AI-powered email generation using Claude API
- 📊 Smart role detection (Software, Data Science, Data Analyst)
- 💾 Template caching and reuse
- 📧 ProtonMail integration for draft creation
- 📁 CSV bulk processing
- 📱 Clean, responsive web interface

## Setup

1. Run the setup script:
   ```bash
   ./setup.sh
   ```

2. The application will automatically open in your browser at `http://localhost:3000`

## Usage

1. **Configuration**
   - Enter your Claude API key
   - Select resume type (Software Engineering or Data Science)
   - Upload your resume PDF

2. **Job Information**
   - Enter job title and company name
   - Paste job description
   - Click "Detect Role Type" to automatically categorize the job

3. **Email Template**
   - Click "Generate New Template" to create AI-powered email
   - Save templates for reuse
   - Load saved templates for similar jobs

4. **Recipients**
   - Upload CSV file with columns: email, first_name, last_name, position
   - Preview recipients before processing

5. **ProtonMail Integration**
   - Enter ProtonMail credentials
   - Click "Generate & Save Drafts" to create personalized drafts

## CSV Format

```csv
email,first_name,last_name,position
john.doe@example.com,John,Doe,Senior Data Scientist
jane.smith@tech.com,Jane,Smith,ML Engineer
```

## ProtonMail Setup

1. Enable 2FA in ProtonMail
2. Generate an app-specific password
3. Use that password in the application

## Tips

- Templates are automatically cached based on job keywords
- Similar jobs will reuse existing templates
- All drafts are saved to your ProtonMail drafts folder
- Review and customize drafts before sending

## Troubleshooting

- Ensure Claude API key is valid
- Check ProtonMail credentials
- Verify CSV format matches expected columns
- Check browser console for any errors
