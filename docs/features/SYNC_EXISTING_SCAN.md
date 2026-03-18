# 🔄 Sync Existing Scan Data from Browser

Your scan data is in the browser's memory but not saved to the database. Here's how to sync it:

---

## Option 1: Browser Console Method (Recommended)

### Step 1: Open Browser Console
- **Chrome/Edge:** Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- **Firefox:** Press `F12` or `Cmd+Shift+K` (Mac)

### Step 2: Copy Scan Data
Paste this in the console and press Enter:

```javascript
// Export current scan data
const exportScans = () => {
  // Try to find React root
  const root = document.getElementById('root');
  const reactRoot = root?._reactRootContainer?._internalRoot?.current;

  // Look for scans in state (this searches through React fiber tree)
  console.log('Searching for scan data...');

  // Alternative: Check localStorage
  const stored = localStorage.getItem('edujourney-recent-scans');
  if (stored) {
    console.log('Found scans in localStorage:');
    const scans = JSON.parse(stored);
    console.log(scans);
    return scans;
  }

  console.log('No scans found in localStorage');
  return null;
};

const scans = exportScans();
// Copy this data
console.log('Scan data:', JSON.stringify(scans, null, 2));
```

### Step 3: Save the Output
- Copy the JSON output from console
- Save it to a file temporarily

---

## Option 2: Refresh and Re-upload (Simplest)

Since the fix is now applied:

1. **Refresh the page** (Cmd+R / Ctrl+R)
2. The new code with auth tokens will load
3. **Click "Scan New Paper"** again
4. Upload the same PDF
5. It will save correctly this time!

---

## Option 3: Manual Re-Sync via Console

If you can see the scan data in the UI:

```javascript
// In browser console
(async () => {
  // Get session token
  const { data: { session } } = await window.supabase?.auth?.getSession();
  const token = session?.access_token;

  if (!token) {
    console.error('Not authenticated!');
    return;
  }

  // Get scan data from UI (you need to paste your scan data here)
  const scanData = {
    // PASTE YOUR SCAN DATA HERE
    id: 'your-scan-id',
    name: 'Your Scan Name',
    // ... rest of scan data
  };

  // Sync to backend
  const response = await fetch('http://localhost:9001/api/scans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(scanData)
  });

  const result = await response.json();
  console.log('Sync result:', result);
})();
```

---

## Option 4: Check Browser Network Tab

1. Open DevTools → **Network** tab
2. Filter by "scans"
3. Find the failed POST request
4. Click on it → **Payload** tab
5. Copy the request payload (that's your scan data)
6. Use Option 3 to re-sync it

---

## Recommended Approach

**Just refresh and re-upload the PDF!**

Since the auth fix is applied:
1. Refresh browser
2. Upload paper again
3. Done! ✅

The previous scan attempt didn't save, so you won't have duplicates.

---

## Need Help?

If the scan data is valuable and you can't re-scan, share the console output and I'll help you sync it manually.
