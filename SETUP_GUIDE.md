# Copilot AI SEO Blog Automation - Complete Setup Guide

**For Both Repositories:**
- `auto-blogger-website-`
- `website-newsletter`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [Workflow](#workflow)
6. [Duplicate Prevention](#duplicate-prevention)
7. [Hero Image Generation](#hero-image-generation)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This system automates blog content creation and publishing for **www.colourdiam.com/blog** with:

✅ **AI-Powered Content Generation** - LLM creates SEO-optimized articles  
✅ **Duplicate Detection** - Multi-layer validation to prevent duplicate posts  
✅ **Hero Image Generation** - AI-generated branded images for each blog post  
✅ **Automatic Publishing** - Uploads to your admin panel with images  
✅ **Internal Linking** - Automatically links to your product pages  
✅ **SEO Optimization** - Schema markup, meta descriptions, keywords  
✅ **Content Registry** - Tracks all published articles in CSV/JSON  

---

## Architecture

### Repository 1: `auto-blogger-website-`
**Purpose**: Core blog generation and upload engine

```
src/
├── index.js                    # Main workflow orchestration
├── config.js                   # Configuration loader
├── generator.js                # LLM article generation
├── uploader.js                 # Playwright browser automation
├── duplicate-checker.js        # Multi-layer duplicate validation
├── hero-image-processor.js     # Image processing (VERIFY→CHECK→VALIDATE→UPLOAD)
├── hero-image-generator.js     # AI image generation (Replicate, DALL-E, Stability)
├── register.js                 # Article registry (CSV tracking)
├── topics.js                   # Topic pool management
├── llm.js                      # LLM API client
└── rss.js                      # RSS feed parser

content/
├── *.md                        # Generated markdown files
├── *.jpg                       # Hero images
└── content-register.csv        # Article database

.env                            # Configuration (gitignored)
.env.example                    # Configuration template
```

### Repository 2: `website-newsletter`
**Purpose**: News aggregation service (optional parallel system)

```
colourdiam-news-service/
├── src/
│   ├── server.js              # Express news server
│   ├── fetch.js               # News fetching logic
│   └── render.js              # HTML rendering
├── data/
│   └── news.json              # Persistent news data
└── package.json
```

---

## Setup Instructions

### Step 1: Clone and Install

```bash
# Repository 1: Auto-Blogger
cd auto-blogger-website-
npm install
npx playwright install chromium

# Install image processing libraries
npm install jimp sharp
npm install replicate openai  # For AI image generation
```

### Step 2: Configure Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

### Step 3: Set Up LLM API

Choose one of these free/paid LLM providers:

**Option A: OpenAI (GPT-4o-mini)**
```env
USER_LLM_BASE_URL=https://api.openai.com/v1
USER_LLM_API_KEY=sk-proj-xxxxxxxxxxxxxx
USER_LLM_MODEL=gpt-4o-mini
```

**Option B: Groq (Free tier available)**
```env
USER_LLM_BASE_URL=https://api.groq.com/openai/v1
USER_LLM_API_KEY=gsk_xxxxxxxxxxxxxx
USER_LLM_MODEL=mixtral-8x7b-32768
```

**Option C: Replicate (For image generation)**
```env
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxx
IMAGE_PROVIDER=replicate
```

### Step 4: Set Admin Credentials

```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
ADMIN_LOGIN_URL=https://www.colourdiam.com/adminlogin
ADMIN_BLOG_URL=https://www.colourdiam.com/Admin/Blog
```

### Step 5: Configure Branding

```env
BRAND_PRIMARY_COLOR=#1a1a2e
BRAND_SECONDARY_COLOR=#d4af37
BRAND_ACCENT_COLOR=#e8d9c3
BRAND_LOGO_PATH=./assets/logo.png
ADD_WATERMARK=true
WATERMARK_TEXT=www.colourdiam.com
```

---

## Configuration

### Complete `.env` Template

```env
# ========================================
# ADMIN PANEL CONFIGURATION
# ========================================
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
ADMIN_LOGIN_URL=https://www.colourdiam.com/adminlogin
ADMIN_DASHBOARD_URL=https://www.colourdiam.com/Admin/Dashboard
ADMIN_BLOG_URL=https://www.colourdiam.com/Admin/Blog

# ========================================
# CONTENT GENERATION MODE
# ========================================
CONTENT_MODE=llm                 # Options: llm, rss
ARTICLES_PER_RUN=1              # Articles to generate per execution
RSS_FEED_URL=                   # Only needed for CONTENT_MODE=rss

# ========================================
# LLM CONFIGURATION
# ========================================
USER_LLM_BASE_URL=https://api.openai.com/v1
USER_LLM_API_KEY=your_api_key
USER_LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7

# ========================================
# HERO IMAGE GENERATION
# ========================================
ENABLE_AI_IMAGE_GENERATION=true
ENABLE_TEMPLATE_IMAGES=false
IMAGE_PROVIDER=replicate        # Options: replicate, dall-e, stability
REPLICATE_API_TOKEN=
OPENAI_API_KEY=
STABILITY_API_KEY=

HERO_IMAGE_WIDTH=1600
HERO_IMAGE_HEIGHT=900
HERO_IMAGE_FORMAT=jpeg
HERO_IMAGE_QUALITY=high

# ========================================
# BRANDING & STYLING
# ========================================
BRAND_PRIMARY_COLOR=#1a1a2e
BRAND_SECONDARY_COLOR=#d4af37
BRAND_ACCENT_COLOR=#e8d9c3
BRAND_LOGO_PATH=./assets/logo.png
ADD_WATERMARK=true
WATERMARK_TEXT=www.colourdiam.com

# ========================================
# DUPLICATE PREVENTION
# ========================================
ENABLE_DUPLICATE_CHECK=true
SEMANTIC_SIMILARITY_THRESHOLD=0.88
MAX_ARTICLES_PER_CATEGORY=2
FAIL_ON_SATURATION=false

# ========================================
# TOPIC MANAGEMENT
# ========================================
TOPIC_POOL=Pink Diamonds,Yellow Diamonds,Blue Diamonds,Engagement Rings,Diamond Education,4Cs Guide,Buying Tips,Jewelry Trends
ENABLE_TOPIC_DIVERSITY=true

# ========================================
# PUBLISHING
# ========================================
AUTO_UPLOAD=false               # Set to true for production
UPLOAD_SCHEDULE=0 * * * *      # Every hour
UPLOAD_HERO_IMAGE=true
SET_IMAGE_ALT_TEXT=true
SET_IMAGE_CAPTION=true

# ========================================
# EXECUTION MODE
# ========================================
RUN_ONCE=false                  # Set to true for testing
HEADLESS=true                   # Browser in headless mode

# ========================================
# LOGGING & MONITORING
# ========================================
ENABLE_PUBLICATION_LOG=true
LOG_FILE_PATH=publication-events.log
EXPORT_VALIDATION_LOG=true
```

---

## Workflow

### Complete Flow Diagram

```
START
  │
  ├─→ [STEP 1] Generate Article
  │   ├─ Select topic from pool
  │   ├─ Call LLM API
  │   ├─ Generate SEO-optimized article
  │   └─ Save markdown + metadata
  │
  ├─→ [STEP 2] Check for Duplicates
  │   ├─ Layer 1: Exact title match
  │   ├─ Layer 2: Semantic similarity (AI)
  │   ├─ Layer 3: Keyword overlap
  │   ├─ Layer 4: URL slug uniqueness
  │   ├─ Layer 5: Topic saturation check
  │   └─ If FAIL → Skip, Move to next topic
  │
  ├─→ [STEP 3] Generate Hero Image
  │   ├─ Create AI image prompt
  │   ├─ Call image API (Replicate/DALL-E/Stability)
  │   ├─ Download generated image
  │   └─ Add brand overlay (logo, text, watermark)
  │
  ├─→ [STEP 4] Process & Validate Image
  │   ├─ VERIFY: File exists and is accessible
  │   ├─ CHECK: Validate dimensions (1600x900), file size
  │   ├─ OPTIMIZE: Resize, compress to JPG
  │   ├─ VALIDATE: Verify output quality
  │   └─ If FAIL → Skip image, continue without it
  │
  ├─→ [STEP 5] Register in Database
  │   ├─ Add entry to content-register.csv
  │   ├─ Record all metadata (keywords, category, status)
  │   └─ Log to publication-events.log
  │
  ├─→ [STEP 6] Pre-Upload Verification
  │   ├─ Check article not already published
  │   ├─ Verify hero image file exists (if included)
  │   ├─ Validate image dimensions one more time
  │   └─ If FAIL → Abort upload, move to next
  │
  ���─→ [STEP 7] Upload to Blog
  │   ├─ Login to admin panel (Playwright)
  │   ├─ Fill article title
  │   ├─ Paste article HTML content
  │   ├─ Upload hero image
  │   ├─ Set image alt text
  │   ├─ Set image caption
  │   ├─ Click Save
  │   └─ If FAIL → Log error, move to next
  │
  ├─→ [STEP 8] Finalize
  │   ├─ Update publication status in register
  │   ├─ Log success event
  │   └─ Output summary (X published, Y failed)
  │
  └─→ END

SCHEDULE: Next run in 1 hour (configurable)
```

### Running the System

**Mode 1: Test Once (RUN_ONCE=true)**
```bash
RUN_ONCE=true AUTO_UPLOAD=false npm start
# Generates 1 article, doesn't upload
# Review in content/ folder before enabling upload
```

**Mode 2: Generate Only (AUTO_UPLOAD=false)**
```bash
AUTO_UPLOAD=false npm start
# Generates articles hourly, saves to content/
# You can manually review and upload later
```

**Mode 3: Full Automation (AUTO_UPLOAD=true)**
```bash
AUTO_UPLOAD=true npm start
# Generates and automatically uploads every hour
# 24/7 automated blog publishing
```

---

## Duplicate Prevention

### Multi-Layer Validation

#### Layer 1: Exact Title Match
```javascript
Check if article H1/title already published
Status: ❌ FAIL if exact match found
```

#### Layer 2: Semantic Similarity (AI)
```javascript
Calculate similarity score using Levenshtein distance
Threshold: 85% by default (configurable)
Status: ❌ FAIL if similarity > 85%
```

#### Layer 3: Keyword Overlap
```javascript
Check primary keyword for exact match
Check supporting keywords for 30%+ overlap
Status: ❌ FAIL if keyword conflict detected
```

#### Layer 4: URL Slug Uniqueness
```javascript
Ensure no duplicate article slugs
Status: ❌ FAIL if slug already exists
```

#### Layer 5: Topic Saturation
```javascript
Limit articles per category (default: 2)
Ensures diverse topic coverage
Status: ⚠️  WARNING if max reached (or ❌ FAIL if configured)
```

### Example Output

```
🔍 STEP 2: CHECK FOR DUPLICATES

Checks performed:
✅ EXACT_TITLE
✅ SEMANTIC_SIMILARITY (78% vs nearest article)
✅ KEYWORD_OVERLAP
✅ SLUG_UNIQUENESS
✅ TOPIC_SATURATION (1/2 articles on "Diamonds")

✅ APPROVED: Article is unique and safe to publish
```

---

## Hero Image Generation

### Workflow

```
Topic: "Pink Diamonds"
     ↓
Generate Image Prompt: "Professional luxury photo of a pink diamond..."
     ↓
Call AI API (Replicate/DALL-E)
     ↓
Download generated image (1600x900)
     ↓
Add Brand Overlay
  - ColourDiam logo (top-left)
  - Article title (centered, 48pt Georgia)
  - Primary keyword (bold, gold color)
  - Watermark: "www.colourdiam.com"
     ↓
Process & Validate
  ✓ VERIFY: File exists
  ✓ CHECK: Dimensions 1600x900, < 500KB
  ✓ OPTIMIZE: Compress to JPG 95% quality
  ✓ VALIDATE: Output dimensions correct
     ↓
Upload to Admin Panel with Article
     ↓
Set Alt Text: "Pink diamond engagement ring with 18k gold setting"
Set Caption: "Professional diamond photography"
```

### Image Specifications

| Property | Value |
|----------|-------|
| Format | JPG |
| Dimensions | 1600 x 900 |
| Aspect Ratio | 16:9 |
| Max File Size | 500 KB |
| Quality | 95% (high) |
| Colors | Navy (#1a1a2e) + Gold (#d4af37) |

---

## Monitoring & Logging

### Log Files

```
publication-events.log
├─ 2025-01-15T10:30:00Z GENERATED "How to Choose Pink Diamonds"
├─ 2025-01-15T10:31:00Z UPLOADED "How to Choose Pink Diamonds" ✅
├─ 2025-01-15T11:30:00Z SKIPPED_DUPLICATE "Pink Diamonds" (semantic similarity 87%)
└─ 2025-01-15T12:30:00Z GENERATED "Yellow Diamond Colors Explained"

content-register.csv
├─ ArticleTitle | URL | PrimaryKeyword | PublishingStatus
├─ How to Choose Pink Diamonds | https://www.colourdiam.com/blog/how-to-choose-pink-diamonds | Pink Diamonds | Published
└─ Yellow Diamond Colors... | ... | Yellow Diamonds | Draft

image-validation.log
├─ VERIFY: ✅ File exists (250KB)
├─ CHECK: ✅ Dimensions 1600x900
├─ OPTIMIZE: ✅ Compressed to 245KB
├─ VALIDATE: ✅ Output valid
└─ UPLOAD: ✅ Uploaded successfully
```

### Dashboard Output

```
🚀 ARTICLE 1/1

📝 Topic: "Pink Diamonds"
✅ Article generated: how-to-choose-pink-diamonds.md

🔍 Checking for duplicates...
✅ Exact title: NO MATCH
✅ Semantic similarity: 78% (OK)
✅ Keyword overlap: NO CONFLICT
✅ Slug uniqueness: YES
✅ Topic saturation: 1/2 (OK)
✅ Duplicate check PASSED

🎨 Generating hero image...
   Using AI image generation (Replicate)
   Prompt: "Professional luxury photo of a pink diamond..."
✅ Hero image file created: how-to-choose-pink-diamonds.jpg

📤 Processing and validating hero image...

🔍 STEP 1: VERIFY IMAGE SOURCE
   ✅ File exists: YES
   ✅ File readable: YES (245 KB)
   ✅ Valid image: YES (1600x900)

✔️ STEP 2: CHECK IMAGE QUALITY
   ✅ Aspect ratio: CORRECT (16:9)
   ✅ File size: OK (245 KB)
   ✅ Image content: VISIBLE
   ✅ Color depth: RGB/RGBA

⚙️ STEP 3: OPTIMIZE IMAGE
   Resizing to 1600x900...
   Compressing to quality 95...
   ✅ Image optimized: 245KB

🧪 STEP 4: VALIDATE OUTPUT
   ✅ File exists: YES
   ✅ File size: 245KB (within limits)
   ✅ Dimensions: CORRECT (1600x900)
   ✅ Content: VISIBLE

✅ ALL STEPS COMPLETED SUCCESSFULLY
```

---

## Troubleshooting

### Problem: "File does not exist" during image upload

**Cause**: Image file path incorrect or file deleted  
**Solution**:
```bash
# Check if file exists
ls -la content/*.jpg

# Verify file size > 0
file content/hero-image.jpg
```

### Problem: Duplicate article detected when it shouldn't be

**Cause**: Semantic similarity threshold too low  
**Solution**:
```env
# Increase threshold from 0.88 to 0.92
SEMANTIC_SIMILARITY_THRESHOLD=0.92
```

### Problem: Hero image appears blank or invalid

**Cause**: AI API returned bad image  
**Solution**:
```bash
# Enable fallback template images
ENABLE_AI_IMAGE_GENERATION=false
ENABLE_TEMPLATE_IMAGES=true
```

### Problem: Upload fails with "Image file not found"

**Cause**: Image processing failed silently  
**Solution**:
```bash
# Check validation log
tail -f image-validation.log

# Run in test mode to debug
RUN_ONCE=true AUTO_UPLOAD=false npm start
```

### Problem: "Image dimensions do not match required 1600x900"

**Cause**: Image not resized properly  
**Solution**:
```bash
# Verify Jimp library installed
npm install jimp

# Clear content folder and retry
rm -rf content/*.jpg
npm start
```

---

## Key Commands

```bash
# Install dependencies
npm install

# Test single run (no upload)
RUN_ONCE=true AUTO_UPLOAD=false npm start

# Generate articles only
AUTO_UPLOAD=false npm start

# Full automation
AUTO_UPLOAD=true npm start

# View logs
tail -f publication-events.log
tail -f image-validation.log

# Check database
cat content/content-register.csv

# View generated articles
ls -la content/
```

---

## Success Checklist

- [ ] `.env` configured with all required fields
- [ ] LLM API key working (tested with simple prompt)
- [ ] Admin credentials correct (can login manually)
- [ ] Browser automation working (`RUN_ONCE=true` test)
- [ ] Hero image generation working (check content/*.jpg)
- [ ] Image validation passing (check image-validation.log)
- [ ] Upload working (check blog admin panel)
- [ ] Database tracking (check content-register.csv)
- [ ] Duplicate detection working (test with repeated topic)
- [ ] Scheduler active (check logs at scheduled time)

---

## Next Steps

1. **Complete Setup** - Follow "Setup Instructions" above
2. **Test Mode** - Run `RUN_ONCE=true AUTO_UPLOAD=false npm start`
3. **Review Output** - Check `content/` folder for articles and images
4. **Manual Upload** - Test uploading 1-2 articles manually
5. **Enable Auto-Upload** - Set `AUTO_UPLOAD=true`
6. **Monitor** - Check logs daily for first week
7. **Optimize** - Adjust LLM prompts, image generation based on results

---

**Status**: Ready for Production Deployment  
**Last Updated**: 2026-08-27  
**Repositories**: 
- auto-blogger-website-
- website-newsletter
