# Reels-Style Product Showcase (PalrixShow)

A lightweight, full-screen vertical scrolling Reels-style product showcase built for **Palrix Fashion**. It is optimized for mobile display, supports color variant switching, slide-specific deep linking, and is 100% serverless and offline-capable.

---

## ⚙️ Tech Stack
* **HTML5 & CSS3**: Structured layout, flexbox/grid layout, Custom scroll snaps, and blur panels.
* **Modern ES6 JavaScript**: Vanilla controller client-side scripting.
* **Bootstrap Icons**: Lightweight SVG icons for action items (Likes, Shares, WhatsApp).
* **Self-Contained Data Layer**: A dynamic client-side CSV parser that falls back to embedded constants when opened offline (CORS-free, safe for `file://` double-clicking index.html).

---

## 📂 Project Directory Structure

```
PalrixShow/
├── index.html                 # Direct standalone vertical scrolling reels entry point
├── README.md                  # Project documentation (this file)
├── css/
│   └── style.css              # Main layout, badges, tabs, and action icons styles
├── js/
│   ├── data.js                # Dynamic CSV parser, sellers/products data loaders, fallbacks
│   ├── actions.js             # Share URL builders, LocalStorage counters, WhatsApp enquiry
│   └── showcase.js            # Video IntersectionObserver, horizontal slider, swatches bar
├── data/
│   └── products.csv           # Simple Excel-friendly catalog spreadsheet database
└── images/
    └── products/
        ├── KF-206/            # Folder containing images for product KF-206
        └── [apparel_files]    # Static catalog photos (.jpg, .jpeg, .png)
```

---

## 📊 Catalog Management (Editing the CSV)

The catalog database is located at `data/products.csv`. Any non-technical user can edit this file using **Microsoft Excel** or **Google Sheets**.

### Structure:
Every row in the spreadsheet represents **one slide image / color variant**. 

* **To add another angle image for the same color**: Simply insert a new row with the same `id` and `colorName` but a different `imagePath`.
* **To add a new color variant**: Insert a row with the same `id` but a different `colorName`, `colorCode` (the hex value for the selection dot), and `imagePath`.
* **To add a brand new product**: Simply create rows with a new `id` number!

*Note: Descriptions containing commas should be wrapped in double quotes `"..."` in Excel, although our advanced parser has been configured to automatically recover from unescaped casual quotes (like inches symbols `46"` or `40"`) without breaking.*

---

## 🖼️ Automatic Image Format Recovery

To make catalog updates foolproof for non-technical users, we have implemented an **Extension-Agnostic Image Resolver**:
* If you type an image path ending in `.jpg` inside the CSV (e.g. `image (1).jpg`), but you drop a `.png`, `.jpeg`, or uppercase `.JPG` file in the folder, the browser **automatically tries all alternative extensions on error** until it loads successfully!
* Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp` (both lowercase and uppercase).

---

## 🔗 Slide-Specific Deep Linking & Sharing
* When sharing a product, or clicking **Enquire on WhatsApp**, the app generates a smart hash link combining the Product ID, selected Variant index, and active Slide index:
  `index.html#product-[id]-[variant]-[slide]` (e.g. `index.html#product-201-1-0`)
* When another user clicks this link, the showcase automatically:
  1. Scrolls vertically to the shared product.
  2. Selects the correct color swatch variant.
  3. Scrolls horizontally to show the exact shared photo angle.

---

## 🚀 How to Run and Test

### 1. View Locally on a Web Server (Recommended)
Run the Python HTTP server to bypass browser CORS checks:
```bash
python -m http.server 8085
```
Then open:
👉 **http://localhost:8085**

### 2. View Offline (Double-clicking `index.html`)
Double-click `index.html` on your desktop. The page will load instantly. In this mode, the system automatically bypasses the browser's local file CORS security block by reading the pre-embedded CSV text data inside `js/data.js`.

### 3. Deploy Live
Simply commit your changes and push them to your repository on GitHub. **GitHub Pages** will automatically detect the push and deploy the live version in 1-2 minutes!