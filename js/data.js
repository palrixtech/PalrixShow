/**
 * Data handling layer for PalrixShow
 */
(function () {
  "use strict";

  const PRODUCTS_PATH = "./data/products.json";
  const SELLERS_PATH = "./data/sellers.json";

  let cachedSellers = null;
  let cachedProducts = null;

  /**
   * Load all sellers from JSON
   */
  async function loadSellers() {
    if (cachedSellers) return cachedSellers;

    const response = await fetch(SELLERS_PATH, { cache: "no-cache" });
    if (!response.ok) throw new Error("Sellers loading failed");
    
    const sellers = await response.json();
    if (!Array.isArray(sellers)) throw new Error("Invalid sellers data");
    
    cachedSellers = sellers;
    return sellers;
  }

  /**
   * Load products and filter by sellerId. Normalizes the images/media format.
   */
  async function loadProducts(sellerId) {
    if (!cachedProducts) {
      const response = await fetch(PRODUCTS_PATH, { cache: "no-cache" });
      if (!response.ok) throw new Error("Products loading failed");
      
      const rawProducts = await response.json();
      if (!Array.isArray(rawProducts)) throw new Error("Invalid products data");

      // Normalize products data
      cachedProducts = rawProducts.map(p => {
        // Fallback sellerId
        const sId = p.sellerId || "raj-fashion";
        
        // Normalize media array
        let media = [];
        if (p.media && Array.isArray(p.media)) {
          media = p.media;
        } else if (p.images && Array.isArray(p.images)) {
          media = p.images.map(img => ({
            type: "image",
            url: img
          }));
        }

        return {
          ...p,
          sellerId: sId,
          media: media
        };
      });
    }

    // Filter by sellerId
    return cachedProducts.filter(p => p.sellerId === sellerId);
  }

  // Export to window namespace
  window.ShowcaseData = {
    loadSellers,
    loadProducts
  };
})();
