# 🤖 AI Restaurant Matcher - Setup Guide

## Google Gemini AI Integration

This app uses **Google Gemini AI** for intelligent restaurant matching - and it's **completely FREE**! 🎉

### Why Gemini?
- ✅ **100% Free** - 1,500 requests/day (vs OpenAI's very limited free tier)
- ✅ **No Credit Card Required**
- ✅ **Fast & Reliable** - 15 requests per minute
- ✅ **Great Quality** - Powered by Google's latest AI model

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Get Your FREE API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key that starts with `AIza...`

### Step 2: Add the API Key to Your App

Open your `.env` file and add:

```bash
EXPO_PUBLIC_GEMINI_API_KEY=YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with the key you copied.

### Step 3: Restart the App

```bash
npx expo start -c
```

That's it! 🎉

---

## 📱 How to Use

1. Go to the **AI Matcher** tab
2. Describe what you're craving (e.g., "spicy Thai noodles", "cozy Italian place")
3. Tap **"Find My Match"**
4. Get AI-powered restaurant recommendations!

---

## 🔒 Is My API Key Safe?

- The API key is stored locally on your device
- It's only used to communicate with Google's servers
- Never share your API key publicly

---

## ❓ Troubleshooting

### "Gemini API Key Required" Error
- Make sure you added `EXPO_PUBLIC_GEMINI_API_KEY` to your `.env` file
- Restart the app with `npx expo start -c`

### "Rate limit error"
- You've hit the 15 requests/minute limit
- Wait a minute and try again
- Free tier: 1,500 requests/day (very generous!)

### "No matches found"
- Try describing your preferences differently
- Be more specific (e.g., "spicy ramen" vs "Asian food")

---

## 💡 Tips for Better Matches

- **Be specific**: "spicy Thai curry" > "Asian food"
- **Mention atmosphere**: "cozy", "casual", "upscale"
- **Include dietary needs**: "vegetarian", "gluten-free"
- **Describe mood**: "comfort food", "healthy", "indulgent"

---

## 📊 Limits & Pricing

| Tier | Requests/Day | Requests/Minute | Cost |
|------|--------------|-----------------|------|
| Free | 1,500 | 15 | $0 |

**That's enough for ~100 restaurant searches per day!** 🎉

---

## 🆚 Comparison with OpenAI

| Feature | Google Gemini | OpenAI GPT-3.5 |
|---------|---------------|----------------|
| Free Tier | 1,500 req/day | ~50 requests total |
| Credit Card | Not required | Required |
| Speed | Fast | Fast |
| Quality | Excellent | Excellent |
| **Winner** | ✅ Gemini! | ❌ Too limited |

---

## 🙋 Need Help?

- **Gemini AI Documentation**: https://ai.google.dev/docs
- **Get API Key**: https://aistudio.google.com/app/apikey
- **React Native Integration**: Already set up! Just add your key.

---

Made with ❤️ using Google Gemini AI

