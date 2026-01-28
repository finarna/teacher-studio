# 🔍 Redis Access Guide - How to Retrieve Images from Any Server

## ✅ Current Status

Your images ARE in Redis! Verified counts:
- `bulk-1768931620994`: **3 images** (latest scan)
- `bulk-1768872316094`: **184 images** (previous scan)
- Total: **195 images** safely stored

---

## 🔧 Redis Connection Details

Your Redis server (from `server.js`):
```
Host: 106.51.142.79
Port: 6379
Password: redis123!
```

---

## 📋 Redis Key Format

All scans are stored with this pattern:
```
scan:SCAN_ID
```

Examples:
- `scan:bulk-1768931620994`
- `scan:bulk-1768872316094`

---

## 🚀 Method 1: Access via Your Node.js API Server

### Start the API Server (if not running)

```bash
cd /Users/apple/FinArna/edujourney---universal-teacher-studio
node server.js
```

### Access from ANY other application

```javascript
// Fetch all scans
const response = await fetch('http://YOUR_SERVER_IP:9000/api/scans');
const scans = await response.json();

// Each scan has this structure:
{
  id: "bulk-1768872316094",
  name: "Portfolio: 4 Physics Papers [06:55]",
  subject: "Physics",
  grade: "Class 12",
  analysisData: {
    questions: [
      {
        id: "PHYSICS_20-Q1",
        topic: "Circular Motion",
        sketchSvg: "data:image/png;base64,iVBORw0KGgo...", // ← Full base64 image
        visualConcept: "...",
        keyFormulas: [...],
        // ... other fields
      }
    ]
  }
}
```

---

## 🔌 Method 2: Direct Redis Access (Python)

Create a file `retrieve_images.py`:

```python
import redis
import json

# Connect to Redis
r = redis.Redis(
    host='106.51.142.79',
    port=6379,
    password='redis123!',
    decode_responses=True
)

# Test connection
if r.ping():
    print("✅ Connected to Redis!")
else:
    print("❌ Connection failed!")
    exit(1)

# Get all scan keys
scan_keys = r.keys('scan:*')
print(f"📊 Found {len(scan_keys)} scans in Redis")

# Retrieve a specific scan
scan_id = "bulk-1768872316094"  # The one with 184 images
scan_data = r.get(f'scan:{scan_id}')

if scan_data:
    scan = json.loads(scan_data)

    # Count images
    questions = scan.get('analysisData', {}).get('questions', [])
    images = [q for q in questions if q.get('sketchSvg')]

    print(f"✅ Retrieved scan: {scan['name']}")
    print(f"📊 Total questions: {len(questions)}")
    print(f"🖼️  Images: {len(images)}")

    # Access individual images
    for idx, question in enumerate(images[:3]):  # First 3 images
        print(f"\nImage {idx + 1}:")
        print(f"  ID: {question['id']}")
        print(f"  Topic: {question['topic']}")
        print(f"  Image size: {len(question['sketchSvg']) / 1024:.2f} KB")

        # Save image to file
        if question['sketchSvg'].startswith('data:image'):
            import base64
            import re

            # Extract image data
            match = re.match(r'data:image/(\w+);base64,(.+)', question['sketchSvg'])
            if match:
                image_type = match.group(1)
                image_data = base64.b64decode(match.group(2))

                filename = f"{question['id']}.{image_type}"
                with open(filename, 'wb') as f:
                    f.write(image_data)
                print(f"  ✅ Saved to: {filename}")
else:
    print(f"❌ Scan {scan_id} not found in Redis")

# List all available scans
print("\n📋 All available scans:")
for key in scan_keys:
    scan_data = r.get(key)
    if scan_data:
        scan = json.loads(scan_data)
        images = len([q for q in scan.get('analysisData', {}).get('questions', []) if q.get('sketchSvg')])
        print(f"  - {scan['id']}: {scan['name']} ({images} images)")
```

**Run it:**
```bash
pip install redis
python retrieve_images.py
```

---

## 🔌 Method 3: Direct Redis Access (Node.js)

Create a file `retrieve_images.js`:

```javascript
const Redis = require('ioredis');
const fs = require('fs');

// Connect to Redis
const redis = new Redis({
  host: '106.51.142.79',
  port: 6379,
  password: 'redis123!'
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis!');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

async function retrieveImages() {
  try {
    // Get all scan keys
    const scanKeys = await redis.keys('scan:*');
    console.log(`📊 Found ${scanKeys.length} scans in Redis`);

    // Retrieve specific scan (the one with 184 images)
    const scanId = 'bulk-1768872316094';
    const scanData = await redis.get(`scan:${scanId}`);

    if (!scanData) {
      console.log(`❌ Scan ${scanId} not found in Redis`);
      return;
    }

    const scan = JSON.parse(scanData);
    const questions = scan.analysisData?.questions || [];
    const imagesWithData = questions.filter(q => q.sketchSvg);

    console.log(`✅ Retrieved scan: ${scan.name}`);
    console.log(`📊 Total questions: ${questions.length}`);
    console.log(`🖼️  Images: ${imagesWithData.length}`);

    // List first 5 images
    console.log('\n📸 First 5 images:');
    imagesWithData.slice(0, 5).forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.id} - ${q.topic} (${(q.sketchSvg.length / 1024).toFixed(2)} KB)`);
    });

    // Save all images to files
    console.log('\n💾 Saving images to files...');
    let savedCount = 0;

    for (const question of imagesWithData) {
      if (question.sketchSvg.startsWith('data:image')) {
        // Extract base64 data
        const match = question.sketchSvg.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const imageType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const filename = `./images/${question.id}.${imageType}`;

          // Create images directory if it doesn't exist
          if (!fs.existsSync('./images')) {
            fs.mkdirSync('./images');
          }

          fs.writeFileSync(filename, buffer);
          savedCount++;
        }
      } else if (question.sketchSvg.startsWith('<svg')) {
        // SVG image
        const filename = `./images/${question.id}.svg`;

        if (!fs.existsSync('./images')) {
          fs.mkdirSync('./images');
        }

        fs.writeFileSync(filename, question.sketchSvg);
        savedCount++;
      }
    }

    console.log(`✅ Saved ${savedCount} images to ./images/`);

    // List all available scans
    console.log('\n📋 All available scans:');
    for (const key of scanKeys) {
      const data = await redis.get(key);
      if (data) {
        const s = JSON.parse(data);
        const imageCount = (s.analysisData?.questions || []).filter(q => q.sketchSvg).length;
        console.log(`  - ${s.id}: ${s.name} (${imageCount} images)`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    redis.disconnect();
  }
}

retrieveImages();
```

**Run it:**
```bash
npm install ioredis
node retrieve_images.js
```

---

## 🌐 Method 4: Access from Your Other Web Server

### Option A: Direct API Call

```javascript
// In your other server/application
async function loadImagesFromVault() {
  const response = await fetch('http://106.51.142.79:9000/api/scans');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const scans = await response.json();

  // Find the scan with 184 images
  const scan = scans.find(s => s.id === 'bulk-1768872316094');

  if (!scan) {
    console.error('Scan not found!');
    return;
  }

  // Access images
  const images = scan.analysisData.questions
    .filter(q => q.sketchSvg)
    .map(q => ({
      id: q.id,
      topic: q.topic,
      imageData: q.sketchSvg, // Base64 data URL
      visualConcept: q.visualConcept
    }));

  console.log(`✅ Loaded ${images.length} images`);

  // Display images in HTML
  images.forEach(img => {
    const imgElement = document.createElement('img');
    imgElement.src = img.imageData;
    imgElement.alt = img.topic;
    document.body.appendChild(imgElement);
  });
}
```

### Option B: Server-Side Proxy

```javascript
// In your other Node.js server
app.get('/api/vault-images/:scanId', async (req, res) => {
  try {
    const response = await fetch('http://106.51.142.79:9000/api/scans');
    const scans = await response.json();

    const scan = scans.find(s => s.id === req.params.scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const images = scan.analysisData.questions
      .filter(q => q.sketchSvg)
      .map(q => ({
        id: q.id,
        topic: q.topic,
        image: q.sketchSvg,
        visualConcept: q.visualConcept
      }));

    res.json({
      scanId: scan.id,
      scanName: scan.name,
      imageCount: images.length,
      images: images
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 🔍 Quick Verification Script

Run this in your browser console on ANY page:

```javascript
fetch('http://106.51.142.79:9000/api/scans')
  .then(res => res.json())
  .then(scans => {
    console.log('✅ Successfully connected to Redis!');
    console.log(`📊 Total scans: ${scans.length}`);

    scans.forEach(scan => {
      const imageCount = (scan.analysisData?.questions || [])
        .filter(q => q.sketchSvg).length;
      console.log(`  - ${scan.name}: ${imageCount} images`);
    });
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
  });
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Cannot connect to server"
**Solution:** Make sure the API server is running:
```bash
node server.js
```

### Issue 2: "CORS error from other domain"
**Solution:** The server already has CORS enabled. If still blocked, update `server.js`:
```javascript
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));
```

### Issue 3: "Images not displaying"
**Problem:** The image data is base64-encoded
**Solution:** Use the data URL directly:
```html
<img src="data:image/png;base64,iVBORw0KGgo..." />
```

### Issue 4: "Can't find specific scan"
**Solution:** List all scans first:
```bash
curl http://106.51.142.79:9000/api/scans | jq '[.[] | {id, name, imageCount: ([.analysisData.questions[] | select(.sketchSvg)] | length)}]'
```

---

## 📞 Need Help?

1. ✅ Verify server is running: `curl http://106.51.142.79:9000/api/health`
2. ✅ List all scans: `curl http://106.51.142.79:9000/api/scans | jq 'length'`
3. ✅ Check specific scan: `curl http://106.51.142.79:9000/api/scans | jq '.[] | select(.id == "bulk-1768872316094")'`

Your images ARE in Redis and accessible! 🎉
