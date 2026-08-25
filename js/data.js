/**
 * Data handling layer for PalrixShow (Parses a flat Excel-friendly CSV dynamically with offline fallbacks)
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

  // Offline/CORS-safe fallback representation of the flat CSV
  const FALLBACK_CSV_TEXT = `id,productCode,name,categoryName,description,price,originalPrice,baseLikes,baseShares,isNewArrival,isLimitedStock,isMostSold,isMostLiked,badge,badgeClass,sellerId,colorName,colorCode,imagePath
201,POLO-001,Premium Pique Polo Shirt,Polo Shirts,"A refined men's polo shirt cut for a clean fit from breathable piqué cotton. Finished with a classic ribbed collar and two-button placket.",899,1299,142,34,true,false,false,true,Most Liked,badge-liked,palrix-fashion,Navy Blue,#1d2e47,images/products/polo_navy.jpg
201,POLO-001,Premium Pique Polo Shirt,Polo Shirts,"A refined men's polo shirt cut for a clean fit from breathable piqué cotton. Finished with a classic ribbed collar and two-button placket.",899,1299,142,34,true,false,false,true,Most Liked,badge-liked,palrix-fashion,Navy Blue,#1d2e47,images/products/polo_navy_detail.jpg
201,POLO-001,Premium Pique Polo Shirt,Polo Shirts,"A refined men's polo shirt cut for a clean fit from breathable piqué cotton. Finished with a classic ribbed collar and two-button placket.",899,1299,142,34,true,false,false,true,Most Liked,badge-liked,palrix-fashion,Slate Grey,#8a8d91,images/products/polo_grey.jpg
201,POLO-001,Premium Pique Polo Shirt,Polo Shirts,"A refined men's polo shirt cut for a clean fit from breathable piqué cotton. Finished with a classic ribbed collar and two-button placket.",899,1299,142,34,true,false,false,true,Most Liked,badge-liked,palrix-fashion,Slate Grey,#8a8d91,images/products/polo_grey_detail.jpg
202,TEE-001,Minimalist Graphic Tee,T-Shirts,"An off-duty essential crewneck t-shirt featuring a subtle minimalist chest graphic print. Soft-washed for comfort.",499,799,89,12,true,true,false,false,New Arrival,badge-new,palrix-fashion,White,#e8e9eb,images/products/tee_white.jpg
202,TEE-001,Minimalist Graphic Tee,T-Shirts,"An off-duty essential crewneck t-shirt featuring a subtle minimalist chest graphic print. Soft-washed for comfort.",499,799,89,12,true,true,false,false,New Arrival,badge-new,palrix-fashion,White,#e8e9eb,images/products/tee_white_detail.jpg
202,TEE-001,Minimalist Graphic Tee,T-Shirts,"An off-duty essential crewneck t-shirt featuring a subtle minimalist chest graphic print. Soft-washed for comfort.",499,799,89,12,true,true,false,false,New Arrival,badge-new,palrix-fashion,Black,#1c1d1f,images/products/tee_black.jpg
202,TEE-001,Minimalist Graphic Tee,T-Shirts,"An off-duty essential crewneck t-shirt featuring a subtle minimalist chest graphic print. Soft-washed for comfort.",499,799,89,12,true,true,false,false,New Arrival,badge-new,palrix-fashion,Black,#1c1d1f,images/products/tee_black_detail.jpg
203,DEN-001,Super-Stretch Slim Jeans,Jeans,"Crafted from premium stretch-cotton denim, these slim-fit jeans provide exceptional flexibility and comfort all day long.",1499,2299,256,87,false,false,true,false,Most Sold,badge-sold,palrix-fashion,Indigo Blue,#253b59,images/products/jeans_blue.jpg
203,DEN-001,Super-Stretch Slim Jeans,Jeans,"Crafted from premium stretch-cotton denim, these slim-fit jeans provide exceptional flexibility and comfort all day long.",1499,2299,256,87,false,false,true,false,Most Sold,badge-sold,palrix-fashion,Charcoal Black,#232426,images/products/jeans_black.jpg
204,CRG-001,Utility Cargo Joggers,Cargo Pants,"A modern take on cargo pants. Features an elasticated waist with drawstring, utility side pockets, and cuffed ankles.",1299,1899,195,64,false,true,false,false,Limited Stock,badge-stock,palrix-fashion,Khaki Brown,#9c8b74,images/products/cargo_khaki.jpg
204,CRG-001,Utility Cargo Joggers,Cargo Pants,"A modern take on cargo pants. Features an elasticated waist with drawstring, utility side pockets, and cuffed ankles.",1299,1899,195,64,false,true,false,false,Limited Stock,badge-stock,palrix-fashion,Olive Green,#556b2f,images/products/cargo_olive.jpg
205,TRK-001,Comfort Fleece Track Pants,Track Pants,"Premium athletic sweatpants with side stripe details, secure pockets, and a comfortable drawstring elastic waist.",999,1499,312,110,true,false,true,true,Most Sold,badge-sold,palrix-fashion,Heather Grey,#b0b3b5,images/products/trackpants_grey.jpg
205,TRK-001,Comfort Fleece Track Pants,Track Pants,"Premium athletic sweatpants with side stripe details, secure pockets, and a comfortable drawstring elastic waist.",999,1499,312,110,true,false,true,true,Most Sold,badge-sold,palrix-fashion,Active Black,#161718,images/products/trackpants_black.jpg`;

  let cachedSellers = SELLERS_DATA;
  let cachedProducts = null;

  /**
   * Helper to parse CSV data text, taking care of quoted values
   */
  function parseCSV(text) {
    const rows = [];
    let inQuotes = false;
    let currentValue = "";
    let currentRow = [];
    
    // Normalize newlines
    const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    
    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      const nextChar = cleanedText[i + 1];
      
      if (char === '"') {
        if (!inQuotes) {
          // Double quote only starts a quoted field if it is at the beginning of the field
          if (currentValue.trim() === "") {
            inQuotes = true;
          } else {
            currentValue += '"';
          }
        } else {
          // Inside quotes
          if (nextChar === '"') {
            currentValue += '"';
            i++; // skip next quote
          } else {
            inQuotes = false;
          }
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentValue.trim());
        currentValue = "";
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentValue.trim());
        rows.push(currentRow);
        currentRow = [];
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    // Push last row if text doesn't end with newline
    if (currentRow.length > 0 || currentValue) {
      currentRow.push(currentValue.trim());
      rows.push(currentRow);
    }
    
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => h.trim());
    const mappedRows = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] !== undefined ? values[idx] : "";
      });
      mappedRows.push(row);
    }
    
    return mappedRows;
  }

  /**
   * Groups flat CSV rows into structured nested product objects
   */
  function groupRowsIntoProducts(rows) {
    const productsMap = {};
    
    rows.forEach(row => {
      const id = Number(row.id);
      if (isNaN(id)) return;
      
      if (!productsMap[id]) {
        productsMap[id] = {
          id: id,
          productCode: row.productCode || "",
          name: row.name || "",
          categoryName: row.categoryName || "",
          description: row.description || "",
          price: Number(row.price) || 0,
          originalPrice: Number(row.originalPrice) || 0,
          baseLikes: Number(row.baseLikes) || 0,
          baseShares: Number(row.baseShares) || 0,
          isNewArrival: row.isNewArrival === "true",
          isLimitedStock: row.isLimitedStock === "true",
          isMostSold: row.isMostSold === "true",
          isMostLiked: row.isMostLiked === "true",
          badge: row.badge || "",
          badgeClass: row.badgeClass || "",
          sellerId: row.sellerId || "palrix-fashion",
          variantsMap: {} // grouped colors
        };
      }
      
      const prod = productsMap[id];
      const color = row.colorName || "Default";
      const colorCode = row.colorCode || "#ffffff";
      const image = row.imagePath || "";
      
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
    
    // Transform variants mapping back to array and build media list
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
   * Fetches CSV text with a local fallback if fetch is blocked
   */
  async function getCSVText() {
    try {
      const ts = new Date().getTime();
      const response = await fetch("data/products.csv?t=" + ts, { cache: "no-cache" });
      if (response.ok) {
        return await response.text();
      }
    } catch (_) {
      // Fetch failed due to CORS or local file system protocols
    }
    return FALLBACK_CSV_TEXT;
  }

  /**
   * Load all sellers
   */
  async function loadSellers() {
    return cachedSellers;
  }

  /**
   * Load and group products on demand
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
