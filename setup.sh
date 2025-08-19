#!/bin/bash

# Email Automation System Setup Script
# This script will install dependencies and launch the application

echo "🚀 Setting up Email Automation System..."
echo "========================================"

# Check if Node.js is installed
if ! command -v /opt/homebrew/bin/node &> /dev/null; then
    echo "❌ Node.js is not installed via Homebrew. Please install Node.js first:"
    echo "   brew install node"
    exit 1
fi

# Check if npm is installed
if ! command -v /opt/homebrew/bin/npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
/opt/homebrew/bin/npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create necessary directories
echo "📂 Creating directories..."
mkdir -p uploads
mkdir -p templates
mkdir -p resumes

# Create sample CSV file
echo "📄 Creating sample CSV file..."
cat > sample-recipients.csv << 'EOF'
email,first_name,last_name,position
john.doe@example.com,John,Doe,Senior Data Scientist
jane.smith@techcorp.com,Jane,Smith,ML Engineer
bob.johnson@startup.io,Bob,Johnson,Software Engineer
alice.brown@company.com,Alice,Brown,Data Analyst
EOF

echo "✅ Sample CSV created: sample-recipients.csv"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  IMPORTANT: Please edit .env file with your actual credentials!"
else
    echo "ℹ️  .env file already exists"
fi

# Create .gitignore file
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
uploads/
templates.json
*.log
.env
.DS_Store
EOF

# Create README with instructions
echo "📖 Creating README..."
cat > README.md << 'EOF'
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
EOF

echo "📋 Setup Complete! Next Steps:"
echo "1. Edit the .env file with your actual credentials:"
echo "   nano .env  # or use any text editor"
echo ""
echo "2. Required in .env file:"
echo "   - CLAUDE_API_KEY=your_claude_api_key_here"
echo "   - PROTONMAIL_EMAIL=your@protonmail.com"
echo "   - PROTONMAIL_APP_PASSWORD=your_app_password_here"
echo ""
echo "3. Then launch the application:"
echo "   ./launch.sh"
echo ""
echo "📁 Sample files created:"
echo "   - sample-recipients.csv (example CSV format)"
echo "   - .env (configuration template - EDIT THIS!)"
echo ""
echo "🔧 Get your credentials:"
echo "   - Claude API key: https://console.anthropic.com/"
echo "   - ProtonMail app password: ProtonMail Settings > Security"
echo ""

# Don't auto-start - user needs to configure .env first
echo "⚠️  Please edit .env file with your credentials, then run ./launch.sh"
echo "🔍 To edit .env: nano .env"
echo "🚀 To launch after setup: ./launch.sh"