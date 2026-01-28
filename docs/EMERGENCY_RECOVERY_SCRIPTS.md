# 🚨 Emergency Recovery Scripts for Sketch Images

## ⚠️ IMPORTANT: Use These Scripts ONLY if UI Buttons Don't Work

These scripts allow you to manually download images or sync to Redis if the UI fails.

---

## 📥 Script 1: Download All Images from Current Browser State

**When to use:** UI buttons not working, need to save images immediately

**How to use:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Copy and paste this entire script:

```javascript
(async function downloadAllImages() {
  console.log('🚀 Starting emergency image download...');

  // Get all image data from React state (use React DevTools or DOM inspection)
  const imageElements = document.querySelectorAll('img[src^="data:image"], .card-svg-container');
  let downloadCount = 0;

  imageElements.forEach((el, index) => {
    try {
      let imageData, filename, isSvg = false;

      if (el.classList.contains('card-svg-container')) {
        // SVG image
        imageData = el.innerHTML;
        isSvg = true;
        filename = `emergency_svg_${Date.now()}_${index}.svg`;
      } else if (el.tagName === 'IMG') {
        // PNG/JPG image
        imageData = el.src;
        filename = `emergency_image_${Date.now()}_${index}.png`;
      } else {
        return;
      }

      const link = document.createElement('a');

      if (isSvg) {
        const blob = new Blob([imageData], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = imageData;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isSvg) {
        URL.revokeObjectURL(link.href);
      }

      downloadCount++;
    } catch (err) {
      console.error(`Failed to download image ${index}:`, err);
    }
  });

  console.log(`✅ Downloaded ${downloadCount} images`);
  alert(`Emergency download complete: ${downloadCount} images saved!`);
})();
```

---

## 💾 Script 2: Force Sync Current State to Redis

**When to use:** Need to manually push all images to Redis

**How to use:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Copy and paste this script:

```javascript
(async function forceSyncToRedis() {
  console.log('🔄 Starting force sync to Redis...');

  try {
    // Get the latest scan from localStorage or React state
    const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('edujourney_v1_'));
    console.log(`Found ${storageKeys.length} cache entries`);

    // Try to fetch current scans from API
    const response = await fetch('http://localhost:9000/api/scans');
    const scans = await response.json();
    console.log(`📊 Loaded ${scans.length} scans from Redis`);

    // You'll need to manually identify which scan to sync
    // List all scans
    scans.forEach((scan, idx) => {
      const imageCount = scan.analysisData?.questions?.filter(q => q.sketchSvg).length || 0;
      console.log(`${idx}: ${scan.name} (${scan.id}) - ${imageCount} images`);
    });

    console.log('⚠️ To sync a specific scan, run:');
    console.log('await fetch("http://localhost:9000/api/scans", {');
    console.log('  method: "POST",');
    console.log('  headers: { "Content-Type": "application/json" },');
    console.log('  body: JSON.stringify(scans[INDEX_NUMBER])');
    console.log('});');

  } catch (err) {
    console.error('❌ Force sync failed:', err);
    alert('Force sync failed. Check console for details.');
  }
})();
```

---

## 🔍 Script 3: Inspect Current Browser State

**When to use:** Need to see what images are currently in memory

**How to use:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Copy and paste this script:

```javascript
(function inspectImageState() {
  console.log('🔍 Inspecting current image state...');

  // Check localStorage cache
  const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('edujourney_v1_'));
  console.log(`📦 LocalStorage cache entries: ${cacheKeys.length}`);

  cacheKeys.forEach(key => {
    try {
      const entry = JSON.parse(localStorage.getItem(key));
      const sizeKB = (JSON.stringify(entry).length / 1024).toFixed(2);
      console.log(`  - ${key}: ${entry.type}, ${sizeKB} KB`);
    } catch (e) {
      console.log(`  - ${key}: [corrupted]`);
    }
  });

  // Check visible images
  const images = document.querySelectorAll('img[src^="data:image"]');
  const svgs = document.querySelectorAll('.card-svg-container svg');

  console.log(`\n🖼️ Visible images: ${images.length} PNG/JPG, ${svgs.length} SVG`);

  let totalSize = 0;
  images.forEach((img, idx) => {
    const sizeKB = (img.src.length / 1024).toFixed(2);
    totalSize += parseFloat(sizeKB);
    console.log(`  Image ${idx + 1}: ${sizeKB} KB`);
  });

  console.log(`\n📊 Total visible image size: ${totalSize.toFixed(2)} KB (${(totalSize/1024).toFixed(2)} MB)`);

  // Check if data is available in React DevTools
  console.log('\n💡 TIP: Open React DevTools to inspect component state directly');
})();
```

---

## 🆘 Script 4: Export Everything as Backup

**When to use:** Ultimate safety - export ALL data before doing anything risky

**How to use:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Copy and paste this script:

```javascript
(async function createFullBackup() {
  console.log('💾 Creating full backup...');

  try {
    // Get all scans from Redis
    const response = await fetch('http://localhost:9000/api/scans');
    const scans = await response.json();

    // Get all localStorage cache
    const cache = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('edujourney_v1_')) {
        try {
          cache[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          cache[key] = localStorage.getItem(key);
        }
      }
    });

    const backup = {
      timestamp: new Date().toISOString(),
      scans: scans,
      localStorage: cache,
      stats: {
        totalScans: scans.length,
        totalCacheEntries: Object.keys(cache).length,
        totalImages: scans.reduce((sum, scan) => {
          return sum + (scan.analysisData?.questions?.filter(q => q.sketchSvg).length || 0);
        }, 0)
      }
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `FULL_BACKUP_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Full backup created!');
    console.log(`📊 Stats:`, backup.stats);
    alert(`✅ Full backup downloaded!\n\nScans: ${backup.stats.totalScans}\nImages: ${backup.stats.totalImages}\nCache entries: ${backup.stats.totalCacheEntries}`);

  } catch (err) {
    console.error('❌ Backup failed:', err);
    alert('Backup failed. Check console for details.');
  }
})();
```

---

## 📋 Quick Checklist

Before panicking, try these in order:

1. ✅ Use the **UI buttons** first (Download, Force Sync, Backup)
2. ✅ If UI fails, use **Script 4** to create full backup
3. ✅ Use **Script 1** to download visible images
4. ✅ Use **Script 3** to inspect what you have
5. ✅ Use **Script 2** to manually sync to Redis

---

## 🔧 Troubleshooting

**Q: Scripts don't work?**
- Make sure you're on the Sketch Gallery page
- Check that server is running (localhost:9000)
- Try refreshing the page first

**Q: Download triggers too many files?**
- Your browser may block multiple downloads
- Click "Allow" when prompted
- Or modify script to download one at a time with delays

**Q: How to restore from backup?**
- Contact developer or manually POST backup data to `/api/scans`

---

## ⚡ Pro Tip

Run Script 4 (Full Backup) RIGHT NOW before generating new images. This is your safety net!
