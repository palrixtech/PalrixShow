/**
 * User actions layer for PalrixShow (Like, Share, WhatsApp)
 */
(function () {
  "use strict";

  const LIKES_KEY = "palrixshow_liked_products";

  /**
   * Check if a product is liked
   */
  function isProductLiked(productId) {
    try {
      const liked = JSON.parse(localStorage.getItem(LIKES_KEY)) || [];
      return liked.includes(String(productId));
    } catch (_) {
      return false;
    }
  }

  /**
   * Toggle product like state in local storage
   */
  function toggleLikeProduct(productId) {
    try {
      let liked = JSON.parse(localStorage.getItem(LIKES_KEY)) || [];
      const idStr = String(productId);
      const index = liked.indexOf(idStr);
      let isLiked = false;

      if (index === -1) {
        liked.push(idStr);
        isLiked = true;
      } else {
        liked.splice(index, 1);
        isLiked = false;
      }

      localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
      return isLiked;
    } catch (_) {
      return false;
    }
  }

  /**
   * Get total likes count dynamically (base + state offset)
   */
  function getLikesCount(productId, baseLikes) {
    const isLiked = isProductLiked(productId);
    return baseLikes + (isLiked ? 1 : 0);
  }

  /**
   * Get total shares count dynamically from local storage
   */
  function getSharesCount(productId, baseShares) {
    try {
      const sharesKey = `palrixshow_shares_${productId}`;
      const extraShares = Number(localStorage.getItem(sharesKey)) || 0;
      return baseShares + extraShares;
    } catch (_) {
      return baseShares;
    }
  }

  /**
   * Increment mock share count in local storage
   */
  function incrementShareCount(productId) {
    try {
      const sharesKey = `palrixshow_shares_${productId}`;
      const current = Number(localStorage.getItem(sharesKey)) || 0;
      localStorage.setItem(sharesKey, current + 1);
    } catch (_) {}
  }

  /**
   * Generate sharing URL for a specific product, variant, and slide
   */
  function getProductShareUrl(sellerSlug, productId, variantIndex = 0, slideIndex = 0) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?seller=${encodeURIComponent(sellerSlug)}#product-${encodeURIComponent(productId)}-${variantIndex}-${slideIndex}`;
  }

  /**
   * Share product using Web Share API or Clipboard Copy
   */
  async function shareProduct(product, seller, variantIndex, slideIndex, onToast) {
    const url = getProductShareUrl(seller.slug, product.id, variantIndex, slideIndex);
    const text = `Check out this ${product.name} from ${seller.name}!`;

    // Increment share count
    incrementShareCount(product.id);

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: text,
          url: url
        });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      if (onToast) onToast("Link copied to clipboard!");
    } catch (_) {
      if (onToast) onToast("Failed to copy link, please copy URL manually.");
    }
  }

  /**
   * Generate and open WhatsApp message URL
   */
  function openWhatsAppEnquiry(product, seller, variantIndex, slideIndex) {
    const phoneClean = String(seller.whatsappNumber || seller.phone).replace(/\D/g, "");

    // Get selected variant info
    const variants = product.variants || [];
    const selectedVariant = variants[variantIndex] || variants[0];
    const colorName = selectedVariant ? selectedVariant.colorName : "";

    let text = `Hi, I'm interested in *${product.name}*`;
    if (product.productCode) {
      text += ` (Code: ${product.productCode})`;
    }
    text += `.`;

    if (colorName && colorName !== "Default") {
      text += `\n🎨 Color: ${colorName}`;
    }

    if (product.sizes && product.sizes.length > 0) {
      text += `\n📏 Available Sizes: ${product.sizes.join(", ")}`;
    }

    if (product.price) {
      text += `\n💰 Price: ₹${product.price.toLocaleString("en-IN")}`;
    }

    text += `\n\nIs it available? Please confirm.`;

    // Append share link so seller knows exact product/color/slide
    const productUrl = getProductShareUrl(seller.slug, product.id, variantIndex, slideIndex);
    text += `\n🔗 ${productUrl}`;

    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  // Export to window namespace
  window.ShowcaseActions = {
    isProductLiked,
    toggleLikeProduct,
    getLikesCount,
    getSharesCount,
    incrementShareCount,
    shareProduct,
    openWhatsAppEnquiry
  };
})();
