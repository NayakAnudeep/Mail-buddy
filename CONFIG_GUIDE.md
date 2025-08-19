# Environment Configuration Guide

## 🔐 Secure Configuration with Environment Variables

Your sensitive credentials are now stored in a `.env` file instead of being entered in the web interface. This is much more secure!

## 📝 Setup Instructions

### 1. Edit your .env file
```bash
nano .env
# or use any text editor like VS Code, TextEdit, etc.
```

### 2. Required Environment Variables

```bash
# Claude API Configuration
CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ProtonMail Configuration  
PROTONMAIL_EMAIL=your@protonmail.com
PROTONMAIL_APP_PASSWORD=your_16_character_app_password

# Server Configuration (optional)
PORT=3000
NODE_ENV=development

# Application Settings (optional)
DEFAULT_RESUME_TYPE=software
MAX_RECIPIENTS_PER_BATCH=50
RATE_LIMIT_DELAY=1000
```

## 🔑 How to Get Your Credentials

### Claude API Key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-`)

### ProtonMail App Password
1. Log in to ProtonMail
2. Go to Settings → Security
3. Enable Two-Factor Authentication (if not already enabled)
4. Generate an App Password
5. Copy the 16-character password
6. Use this password (NOT your regular ProtonMail password)

## ✅ Configuration Status

The web interface will show you if your configuration is working:
- ✅ **Green**: Credentials configured correctly
- ❌ **Red**: Missing or invalid credentials

## 🔒 Security Benefits

- **No credentials in browser**: Your API keys never leave your computer
- **Not in git**: .env is automatically ignored by git
- **Environment isolation**: Each environment can have different credentials
- **Easy rotation**: Change credentials without touching code

## 🚀 After Configuration

Once your .env file is configured:
```bash
./launch.sh
```

The system will automatically:
- Validate your credentials
- Show configuration status
- Connect to Claude API and ProtonMail
- Generate and save email drafts

## 🛠️ Troubleshooting

### "Missing API Key" Error
- Check that `CLAUDE_API_KEY` is set in .env
- Ensure no extra spaces around the `=`
- Verify the key is valid at console.anthropic.com

### "Missing Credentials" Error  
- Check that both `PROTONMAIL_EMAIL` and `PROTONMAIL_APP_PASSWORD` are set
- Ensure you're using an app password, not your regular password
- Verify ProtonMail 2FA is enabled

### Still Having Issues?
- Check the server logs in terminal
- Ensure .env file is in the correct directory
- Verify no typos in variable names

## 📋 Example .env File

```bash
# Working example (replace with your actual values)
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
PROTONMAIL_EMAIL=john.doe@protonmail.com
PROTONMAIL_APP_PASSWORD=abcd1234efgh5678
PORT=3000
DEFAULT_RESUME_TYPE=software
MAX_RECIPIENTS_PER_BATCH=25
```

## 🎯 Ready to Go!

Once configured, your email automation system will:
1. Generate AI-powered emails using Claude
2. Save personalized drafts to ProtonMail
3. Cache templates for similar jobs
4. Handle bulk processing securely

**No more copying/pasting credentials - everything is automated and secure!** 🔐