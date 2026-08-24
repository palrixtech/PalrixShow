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
   * Generate sharing URL for a specific product and slide
   */
  function getProductShareUrl(sellerSlug, productId, slideIndex = 0) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?seller=${encodeURIComponent(sellerSlug)}#product-${encodeURIComponent(productId)}-${slideIndex}`;
  }

  /**
   * Share product using Web Share API or Clipboard Copy
   */
  async function shareProduct(product, seller, slideIndex, onToast) {
    const url = getProductShareUrl(seller.slug, product.id, slideIndex);
    const text = `Check out this ${product.name} from ${seller.name}!`;

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
  function openWhatsAppEnquiry(product, seller, slideIndex) {
    const phoneClean = String(seller.whatsappNumber || seller.phone).replace(/\D/g, "");
    
    let text = `Hi, I'm interested in ${product.name}`;
    if (product.productCode) {
      text += ` (${product.productCode})`;
    }
    text += `. Is it available?`;
    
    // Also append the share link for clarity so the seller knows exactly which product/color it is
    const productUrl = getProductShareUrl(seller.slug, product.id, slideIndex);
    text += `\nLink: ${productUrl}`;

    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  // Export to window namespace
  window.ShowcaseActions = {
    isProductLiked,
    toggleLikeProduct,
    shareProduct,
    openWhatsAppEnquiry
  };
})();
