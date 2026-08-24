/**
 * Data handling layer for PalrixShow (Self-contained, CORS-free, offline/file protocol safe)
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

  const PRODUCTS_DATA = [
    {
      "id": 201,
      "productCode": "POLO-001",
      "name": "Premium Pique Polo Shirt",
      "categoryName": "Polo Shirts",
      "description": "A refined men's polo shirt cut for a clean fit from breathable piqué cotton. Finished with a classic ribbed collar and two-button placket.",
      "images": [
        "images/products/polo_navy.jpg",
        "images/products/polo_grey.jpg"
      ],
      "attributes": {"Size": ["M", "L", "XL"], "Color": ["Navy Blue", "Slate Grey"], "Fabric": ["100% Piqué Cotton"]},
      "featured": true,
      "createdDate": "2026-08-20",
      "sellerId": "palrix-fashion",
      "price": 899,
      "originalPrice": 1299,
      "baseLikes": 142,
      "baseShares": 34,
      "isNewArrival": true,
      "isLimitedStock": false,
      "isMostSold": false,
      "isMostLiked": true,
      "badge": "Most Liked",
      "badgeClass": "badge-liked"
    },
    {
      "id": 202,
      "productCode": "TEE-001",
      "name": "Minimalist Graphic Tee",
      "categoryName": "T-Shirts",
      "description": "An off-duty essential crewneck t-shirt featuring a subtle minimalist chest graphic print. Soft-washed for comfort.",
      "images": [
        "images/products/tee_white.jpg",
        "images/products/tee_black.jpg"
      ],
      "attributes": {"Size": ["S", "M", "L", "XL"], "Color": ["White", "Black"], "Fabric": ["100% Combed Cotton"]},
      "featured": false,
      "createdDate": "2026-08-22",
      "sellerId": "palrix-fashion",
      "price": 499,
      "originalPrice": 799,
      "baseLikes": 89,
      "baseShares": 12,
      "isNewArrival": true,
      "isLimitedStock": true,
      "isMostSold": false,
      "isMostLiked": false,
      "badge": "New Arrival",
      "badgeClass": "badge-new"
    },
    {
      "id": 203,
      "productCode": "DEN-001",
      "name": "Super-Stretch Slim Jeans",
      "categoryName": "Jeans",
      "description": "Crafted from premium stretch-cotton denim, these slim-fit jeans provide exceptional flexibility and comfort all day long.",
      "images": [
        "images/products/jeans_blue.jpg",
        "images/products/jeans_black.jpg"
      ],
      "attributes": {"Waist": ["30", "32", "34", "36"], "Wash": ["Indigo Blue", "Charcoal Grey"], "Fabric": ["98% Cotton, 2% Elastane"]},
      "featured": true,
      "createdDate": "2026-08-21",
      "sellerId": "palrix-fashion",
      "price": 1499,
      "originalPrice": 2299,
      "baseLikes": 256,
      "baseShares": 87,
      "isNewArrival": false,
      "isLimitedStock": false,
      "isMostSold": true,
      "isMostLiked": false,
      "badge": "Most Sold",
      "badgeClass": "badge-sold"
    },
    {
      "id": 204,
      "productCode": "CRG-001",
      "name": "Utility Cargo Joggers",
      "categoryName": "Cargo Pants",
      "description": "A modern take on cargo pants. Features an elasticated waist with drawstring, utility side pockets, and cuffed ankles.",
      "images": [
        "images/products/cargo_khaki.jpg",
        "images/products/cargo_olive.jpg"
      ],
      "attributes": {"Size": ["M", "L", "XL"], "Color": ["Khaki Brown", "Olive Green"], "Fabric": ["Twill Weave Cotton"]},
      "featured": true,
      "createdDate": "2026-08-23",
      "sellerId": "palrix-fashion",
      "price": 1299,
      "originalPrice": 1899,
      "baseLikes": 195,
      "baseShares": 64,
      "isNewArrival": false,
      "isLimitedStock": true,
      "isMostSold": false,
      "isMostLiked": false,
      "badge": "Limited Stock",
      "badgeClass": "badge-stock"
    },
    {
      "id": 205,
      "productCode": "TRK-001",
      "name": "Comfort Fleece Track Pants",
      "categoryName": "Track Pants",
      "description": "Premium athletic sweatpants with side stripe details, secure pockets, and a comfortable drawstring elastic waist.",
      "images": [
        "images/products/trackpants_grey.jpg",
        "images/products/trackpants_black.jpg",
        "images/products/trackpants_grey.jpg"
      ],
      "attributes": {"Size": ["S", "M", "L", "XL"], "Color": ["Heather Grey", "Active Black"], "Fabric": ["Fleece Cotton Polyester"]},
      "featured": true,
      "createdDate": "2026-08-24",
      "sellerId": "palrix-fashion",
      "price": 999,
      "originalPrice": 1499,
      "baseLikes": 312,
      "baseShares": 110,
      "isNewArrival": true,
      "isLimitedStock": false,
      "isMostSold": true,
      "isMostLiked": true,
      "badge": "Most Sold",
      "badgeClass": "badge-sold"
    }
  ];

  let cachedSellers = SELLERS_DATA;
  let cachedProducts = null;

  /**
   * Load all sellers
   */
  async function loadSellers() {
    return cachedSellers;
  }

  /**
   * Load products and filter by sellerId. Normalizes the images/media format.
   */
  async function loadProducts(sellerId) {
    if (!cachedProducts) {
      // Normalize products data
      cachedProducts = PRODUCTS_DATA.map(p => {
        const sId = p.sellerId || "palrix-fashion";
        
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
