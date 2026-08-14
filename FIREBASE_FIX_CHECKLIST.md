# Firebase Authentication Fix - Quick Checklist

## ⚠️ CRITICAL: Manual Actions Required

Your code is **100% correct**. The issue is **Firebase Console configuration**.

---

## 🔥 STEP 1: Add Authorized Domain (5 minutes)

1. Open: https://console.firebase.google.com
2. Select project: **study-planner-ec1d2**
3. Left sidebar → **Authentication**
4. Top tabs → **Settings**
5. Scroll to **Authorized domains** section
6. Click **"Add domain"**
7. Enter EXACTLY: `ai-study-planner-jhh9.vercel.app`
   - ❌ DON'T include `https://`
   - ❌ DON'T include trailing `/`
   - ✅ Just the domain name
8. Click **"Add"**
9. Wait 2 minutes for propagation

**Expected result:** You should see these 3 domains:
- `study-planner-ec1d2.firebaseapp.com` (default)
- `localhost` (default)
- `ai-study-planner-jhh9.vercel.app` ← **YOUR PRODUCTION**

---

## 🔥 STEP 2: Verify Email/Password Provider (2 minutes)

1. Firebase Console → **Authentication**
2. Click **"Sign-in method"** tab
3. Find **"Email/Password"** in the list
4. Check if status is **"Enabled"** (green)
5. If disabled:
   - Click on "Email/Password"
   - Toggle to **Enabled**
   - Click **"Save"**

---

## 🔥 STEP 3: Verify Google Provider (3 minutes)

1. Firebase Console → **Authentication**
2. Click **"Sign-in method"** tab
3. Find **"Google"** in the list
4. Check if status is **"Enabled"** (green)
5. If disabled or not configured:
   - Click on "Google"
   - Toggle to **Enabled**
   - **Project support email:** Select your email from dropdown
   - Click **"Save"**

---

## 🔥 STEP 4: Test Production App (5 minutes)

1. **Clear browser cache** (or use Incognito window)

2. **Go to:** https://ai-study-planner-jhh9.vercel.app/login

3. **Test Register:**
   - Click "Register" tab
   - Enter name, email, password
   - Click "Create Account"
   - Expected: ✅ Success, redirects to dashboard

4. **Test Sign In:**
   - Click "Sign In" tab
   - Enter email, password
   - Click "Sign In"
   - Expected: ✅ Success, redirects to dashboard

5. **Test Google Sign-In:**
   - Click "Continue with Google" button
   - Expected: ✅ Google popup opens
   - Select account
   - Expected: ✅ Success, redirects to dashboard

---

## 🔥 STEP 5: Use Test Tool (Optional)

I created a Firebase testing tool for you:

**URL:** https://ai-study-planner-jhh9.vercel.app/test-firebase-auth.html

This page tests ONLY Firebase authentication (no backend, no Next.js).

**What it shows:**
- ✅ Configuration check
- ✅ Register test with exact error codes
- ✅ Sign in test with exact error codes
- ✅ Google sign-in test with exact error codes

**Use this if you still see errors after Steps 1-4.**

---

## ✅ Success Checklist

After completing Steps 1-4, verify:

- [ ] Register new account works
- [ ] Email/Password sign in works
- [ ] Google sign-in works
- [ ] Dashboard loads after login
- [ ] No "unauthorized domain" error
- [ ] No Firebase errors in browser console

---

## 🚨 If Still Not Working

**Screenshot and send me:**
1. Firebase Console → Authentication → Settings → Authorized domains list
2. Firebase Console → Authentication → Sign-in method (Email & Google status)
3. Browser Console (F12) → Any error messages
4. Test tool results (if you used it)

I'll diagnose the remaining issue.

---

## 📊 Current Status

✅ **Code:** 100% correct, no changes needed
✅ **Configuration files:** Correct
✅ **Environment variables:** Set correctly
⚠️ **Firebase Console:** Requires your manual action

**Estimated time to fix:** 10-15 minutes
**Action required:** Add domain + verify providers (see Steps 1-3)

---

## 🎯 Why This Happened

Firebase has a security feature that only allows authentication from **authorized domains**. Your code is trying to authenticate from `ai-study-planner-jhh9.vercel.app`, but Firebase doesn't have this domain in its authorized list yet.

Adding the domain fixes the `auth/unauthorized-domain` error.

---

## Need Help?

If you encounter any issues:
1. Complete Steps 1-4
2. Take screenshots as described above
3. Send them to me
4. I'll help diagnose the remaining problem

**Let me know once you've completed these steps!**
