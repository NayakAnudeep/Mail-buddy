#!/bin/bash

# Apple Mail Import Script for Email Drafts
echo "🍎 Importing drafts to Apple Mail..."

DRAFTS_DIR="/Users/anudeepn/Documents/email-automation-system/drafts"
RESUME_DIR="/Users/anudeepn/Documents/email-automation-system/resumes"

# Check if drafts directory exists
if [ ! -d "$DRAFTS_DIR" ]; then
    echo "❌ Drafts directory not found: $DRAFTS_DIR"
    exit 1
fi

# Count .eml files
EML_COUNT=$(find "$DRAFTS_DIR" -name "*.eml" | wc -l)
echo "📧 Found $EML_COUNT draft files to import"

if [ $EML_COUNT -eq 0 ]; then
    echo "❌ No .eml files found. Generate drafts first!"
    exit 1
fi

# Import each .eml file to Apple Mail
echo "📤 Importing to Apple Mail..."
find "$DRAFTS_DIR" -name "*.eml" -exec open -a "Mail" {} \;

echo "⏳ Waiting for Apple Mail to process files..."
sleep 5

echo "✅ Import completed!"
echo ""
echo "📋 Next steps:"
echo "1. Open Apple Mail"
echo "2. Look for imported emails in your inbox"
echo "3. Drag each email to your ProtonMail Drafts folder"
echo "4. Attach resume files from: $RESUME_DIR"
echo "5. Portfolio link is already included: https://anudeepnayak.dev/"
echo ""
echo "📁 Resume files available:"
ls -la "$RESUME_DIR"/*.pdf 2>/dev/null || echo "❌ No resume files found"

echo ""
echo "🎯 All done! Check Apple Mail now."
