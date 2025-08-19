# 📧 Multi-Email Provider Setup Guide

## 🎯 **Supported Email Providers**

Your email automation system now supports **3 major email providers**:

- **🔴 Gmail** (gmail.com)
- **🔵 Outlook/Hotmail** (outlook.com, hotmail.com, live.com)
- **🟡 ProtonMail** (protonmail.com)

## 🔑 **Environment Configuration**

Edit your `.env` file and choose **ONE** provider:

### Option 1: Gmail
```bash
EMAIL_PROVIDER=gmail
EMAIL_ADDRESS=your@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

### Option 2: Outlook/Hotmail
```bash
EMAIL_PROVIDER=outlook
EMAIL_ADDRESS=your@outlook.com
EMAIL_APP_PASSWORD=your_outlook_app_password
```

### Option 3: ProtonMail
```bash
EMAIL_PROVIDER=protonmail
EMAIL_ADDRESS=your@protonmail.com
EMAIL_APP_PASSWORD=your_protonmail_app_password
```

## 🔐 **How to Get App Passwords**

### 🔴 **Gmail Setup:**
1. Go to **Google Account Settings**: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Go to **Security** → **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "Email Automation System"
6. Copy the 16-character password

### 🔵 **Outlook/Hotmail Setup:**
1. Go to **Microsoft Account Security**: https://account.microsoft.com/security/
2. Navigate to **Advanced security options**
3. Enable **Two-step verification** (if not already enabled)
4. Go to **App passwords** → **Create a new app password**
5. Enter "Email Automation System"
6. Copy the generated password

### 🟡 **ProtonMail Setup:**
1. Log in to **ProtonMail**
2. Go to **Settings** → **Security**
3. Enable **Two-Factor Authentication** (if not already enabled)
4. Navigate to **App passwords**
5. Generate new app password for "Email Automation System"
6. Copy the 16-character password

## 📊 **Configuration Status**

The web interface shows:

| Status | Meaning |
|--------|---------|
| ✅ **Claude API: Configured** | API key is valid |
| ✅ **Email Provider: your@email.com** | Email credentials working |
| 🔴 **Provider Type: Gmail** | Currently using Gmail |
| 🔵 **Provider Type: Outlook** | Currently using Outlook |
| 🟡 **Provider Type: ProtonMail** | Currently using ProtonMail |

## 🔄 **Switching Providers**

To switch email providers:

1. **Edit .env file:**
   ```bash
   # Change these lines:
   EMAIL_PROVIDER=gmail    # Change to: outlook or protonmail
   EMAIL_ADDRESS=new@email.com
   EMAIL_APP_PASSWORD=new_app_password
   ```

2. **Restart the application:**
   ```bash
   ./launch.sh
   ```

3. **Verify configuration:**
   - Check web interface shows correct provider
   - Test draft creation

## 🎯 **How Draft Creation Works**

### All Providers:
1. **Creates drafts** by sending emails to yourself
2. **Subject line** prefixed with "DRAFT:"
3. **Email body** shows intended recipient and content
4. **Professional formatting** with provider info
5. **Easy to forward** - just change recipient and remove "DRAFT:"

### Example Draft Email:
```
Subject: DRAFT: Interest in Data Scientist role at Google

📧 DRAFT EMAIL
To: recruiter@google.com
Subject: Interest in Data Scientist role at Google
Provider: GMAIL

Hi John,

I hope this message finds you well. I'm writing to express my keen interest in the Data Scientist opportunity at Google...
```

## ⚡ **Provider-Specific Features**

### Gmail Advantages:
- **Excellent deliverability**
- **Large storage** (15GB free)
- **Advanced search** and filtering
- **Integration** with Google Workspace

### Outlook Advantages:
- **Business-friendly** interface
- **Office 365 integration**
- **Professional appearance**
- **Corporate compatibility**

### ProtonMail Advantages:
- **End-to-end encryption**
- **Privacy-focused**
- **No tracking**
- **Swiss-based servers**

## 🛠️ **Troubleshooting**

### "Missing Credentials" Error:
- Check `.env` file has all three variables
- Verify no typos in variable names
- Ensure app password (not regular password)

### "Authentication Failed":
- Regenerate app password
- Check 2FA is enabled
- Verify email address is correct

### Drafts Not Appearing:
- Check your email's **Sent** folder
- Look for emails with "DRAFT:" prefix
- Verify SMTP settings for your provider

## 🎊 **Ready to Use!**

Once configured:
1. **✅ Green status** indicators in web interface
2. **Generate templates** using Claude AI
3. **Bulk process** CSV recipients
4. **Review drafts** in your email provider
5. **Forward to recipients** when ready

**Your multi-provider email automation system is ready!** 🚀