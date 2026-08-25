/**
 * Data handling layer for PalrixShow
 * Always fetches the latest products.csv from the server — no hardcoded fallback needed.
 */
(function () {
  "use strict";

  const SELLERS_DATA = [
    {
      "id": "palrix-fashion",
      "name": "Palrix Fashion",
      "slug": "palrix-fashion",
      "logo": "PF",
      "phone": "+91 84900 21341",
      "whatsappNumber": "918490021341",
      "description": "Premium Men's Wear Collection",
      "location": "Surat, Gujarat, India"
    }
  ];

  let cachedSellers = SELLERS_DATA;
  let cachedProducts = null;

  /**
   * Robust RFC-4180 compliant CSV parser.
   * Handles: quoted fields, commas inside quotes, escaped quotes (""),
   * unescaped casual double quotes (like 46" or 40"), TRUE/FALSE (case-insensitive),
   * and line breaks inside unquoted descriptions.
   */
  function parseCSV(text) {
    const rows = [];
    let inQuotes = false;
    let currentValue = "";
    let currentRow = [];

    // Normalize all line endings to \n
    const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      const nextChar = cleanedText[i + 1];

      if (char === '"') {
        if (!inQuotes) {
          // Start quoted field only if at beginning of current field
          if (currentValue.trim() === "") {
            inQuotes = true;
          } else {
            // Casual quote in the middle (e.g. 46") — treat as literal
            currentValue += '"';
          }
        } else {
          // Inside a quoted field
          if (nextChar === '"') {
            // Escaped quote ("") → single quote
            currentValue += '"';
            i++;
          } else {
            // End of quoted field
            inQuotes = false;
          }
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentValue.trim());
        currentValue = "";
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentValue.trim());
        // Only push rows that have enough columns (skip fragment lines from broken descriptions)
        if (currentRow.length > 1) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = "";
      } else if (char === '\n' && inQuotes) {
        // Newline inside a quoted field — keep it as a space (flatten multiline cells)
        currentValue += ' ';
      } else {
        currentValue += char;
      }
    }

    // Push final row if file doesn't end with newline
    if (currentRow.length > 0 || currentValue.trim()) {
      currentRow.push(currentValue.trim());
      if (currentRow.length > 1) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    const mappedRows = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      // Skip rows where the number of values doesn't reasonably match the header count
      if (values.length < Math.floor(headers.length / 2)) continue;
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] !== undefined ? values[idx].trim() : "";
      });
      mappedRows.push(row);
    }

    return mappedRows;
  }

  /**
   * Parse a boolean column value safely.
   * Accepts: "true", "TRUE", "True", "1", "yes", "YES"
   */
  function parseBool(val) {
    if (!val) return false;
    return ["true", "1", "yes"].includes(val.trim().toLowerCase());
  }

  /**
   * Groups flat CSV rows into nested product objects
   */
  function groupRowsIntoProducts(rows) {
    const productsMap = {};

    rows.forEach(row => {
      if (!row.id || row.id.trim() === "") return;
      const id = row.id.trim();

      if (!productsMap[id]) {
        productsMap[id] = {
          id: id,
          productCode: row.productCode || "",
          name: (row.name || "").trim(),
          categoryName: (row.categoryName || "").trim(),
          description: (row.description || "").trim(),
          price: Number(row.price) || 0,
          originalPrice: Number(row.originalPrice) || 0,
          baseLikes: Number(row.baseLikes) || 0,
          baseShares: Number(row.baseShares) || 0,
          isNewArrival: parseBool(row.isNewArrival),
          isLimitedStock: parseBool(row.isLimitedStock),
          isMostSold: parseBool(row.isMostSold),
          isMostLiked: parseBool(row.isMostLiked),
          badge: (row.badge || "").trim(),
          badgeClass: (row.badgeClass || "").trim(),
          sellerId: (row.sellerId || "palrix-fashion").trim(),
          variantsMap: {}
        };
      }

      const prod = productsMap[id];
      const color = (row.colorName && row.colorName.trim()) ? row.colorName.trim() : "Default";
      const colorCode = (row.colorCode && row.colorCode.trim()) ? row.colorCode.trim() : "#ffffff";
      const image = (row.imagePath || "").trim();

      if (image) {
        if (!prod.variantsMap[color]) {
          prod.variantsMap[color] = {
            colorName: color,
            colorCode: colorCode,
            images: []
          };
        }
        prod.variantsMap[color].images.push(image);
      }
    });

    return Object.values(productsMap).map(prod => {
      const variants = Object.values(prod.variantsMap);
      delete prod.variantsMap;
      return {
        ...prod,
        variants: variants,
        media: variants.length > 0 ? variants[0].images.map(img => ({ type: "image", url: img })) : []
      };
    });
  }

  /**
   * Fetches the live products.csv with cache busting.
   * Always fetches fresh — no hardcoded fallback so new products always appear automatically.
   */
  async function getCSVText() {
    const ts = new Date().getTime();
    const response = await fetch("data/products.csv?t=" + ts, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Could not load products.csv (HTTP " + response.status + ")");
    }
    return await response.text();
  }

  /**
   * Load all sellers
   */
  async function loadSellers() {
    return cachedSellers;
  }

  /**
   * Load and group products on demand (cached per page session)
   */
  async function loadProducts(sellerId) {
    if (!cachedProducts) {
      const csvText = await getCSVText();
      const rows = parseCSV(csvText);
      cachedProducts = groupRowsIntoProducts(rows);
    }
    return cachedProducts.filter(p => p.sellerId === sellerId);
  }

  // Export to window namespace
  window.ShowcaseData = {
    loadSellers,
    loadProducts
  };
})();
