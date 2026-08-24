/**
 * Showcase page controller for PalrixShow
 */
(function () {
  "use strict";

  const D = window.ShowcaseData;
  const A = window.ShowcaseActions;

  // DOM references
  const feedContainer = document.getElementById("feedContainer");
  const sellerLogo = document.getElementById("sellerLogo");
  const sellerName = document.getElementById("sellerName");
  const productCounter = document.getElementById("productCounter");
  const shareToast = document.getElementById("shareToast");

  let currentSeller = null;
  let productsList = [];
  let totalProducts = 0;
  let activeVideo = null;
  let globalMuted = true; // start muted by default

  /**
   * Helper to display a toast message
   */
  function showToast(message) {
    shareToast.textContent = message;
    shareToast.classList.add("show");
    setTimeout(() => {
      shareToast.classList.remove("show");
    }, 2500);
  }

  /**
   * Get parameters from query or hash
   */
  function getSellerSlug() {
    const params = new URLSearchParams(window.location.search);
    let seller = params.get("seller");
    
    // If not found in query, check hash format like index.html#/mehta-jewellers
    if (!seller && window.location.hash) {
      const hashParts = window.location.hash.split("#");
      if (hashParts.length > 1 && !hashParts[1].startsWith("product-")) {
        seller = hashParts[1];
      }
    }
    
    return seller || "raj-fashion"; // default
  }

  /**
   * Render state screen for errors or not found
   */
  function renderStateScreen(title, description, buttonText, onAction) {
    feedContainer.innerHTML = "";
    
    const container = document.createElement("div");
    container.className = "state-container";
    
    const icon = document.createElement("div");
    icon.className = "state-icon";
    icon.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i>';
    
    const titleEl = document.createElement("div");
    titleEl.className = "state-title";
    titleEl.textContent = title;
    
    const descEl = document.createElement("div");
    descEl.className = "state-desc";
    descEl.textContent = description;
    
    const btn = document.createElement("button");
    btn.className = "state-btn";
    btn.textContent = buttonText;
    btn.addEventListener("click", onAction);
    
    container.append(icon, titleEl, descEl, btn);
    feedContainer.append(container);
  }

  /**
   * Render horizontal media items dots indicators
   */
  function createMediaDots(mediaLength) {
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "media-dots";
    
    for (let index = 0; index < mediaLength; index++) {
      const dot = document.createElement("span");
      dot.className = `media-dot${index === 0 ? " active" : ""}`;
      dotsWrap.append(dot);
    }
    
    return dotsWrap;
  }

  /**
   * Create a single product reel item markup and event listeners
   */
  function createReelItem(product, index) {
    const item = document.createElement("article");
    item.className = "reel-item";
    item.dataset.productId = product.id;
    item.dataset.index = index;

    // 1. Horizontal slider for media
    const slider = document.createElement("div");
    slider.className = "media-slider";
    
    product.media.forEach(m => {
      const slide = document.createElement("div");
      slide.className = "media-slide";

      // Blurred background fallback
      const blurBg = document.createElement("img");
      blurBg.className = "media-blur-bg";
      blurBg.alt = "";
      
      if (m.type === "video") {
        // Use video thumbnail or a blank placeholder for blur if no thumbnail
        blurBg.src = m.thumbnail || product.images?.[0] || "";
        
        const video = document.createElement("video");
        video.className = "media-content";
        video.src = m.url;
        video.loop = true;
        video.muted = globalMuted;
        video.playsInline = true;
        video.setAttribute("webkit-playsinline", "true");
        if (m.thumbnail) video.poster = m.thumbnail;
        
        slide.append(blurBg, video);
      } else {
        blurBg.src = m.url;
        
        const img = document.createElement("img");
        img.className = "media-content";
        img.src = m.url;
        img.alt = product.name;
        img.loading = index < 2 ? "eager" : "lazy";
        
        slide.append(blurBg, img);
      }
      
      slider.append(slide);
    });
    
    item.append(slider);

    // 2. Add tap targets for easy horizontal navigation
    if (product.media.length > 1) {
      const tapLeft = document.createElement("div");
      tapLeft.className = "tap-left";
      const tapRight = document.createElement("div");
      tapRight.className = "tap-right";

      tapLeft.addEventListener("click", () => {
        const width = slider.clientWidth;
        slider.scrollBy({ left: -width, behavior: "smooth" });
      });

      tapRight.addEventListener("click", () => {
        const width = slider.clientWidth;
        slider.scrollBy({ left: width, behavior: "smooth" });
      });

      item.append(tapLeft, tapRight);
      
      // Dots indicators
      const dots = createMediaDots(product.media.length);
      item.append(dots);

      // Track scroll to update active dot
      slider.addEventListener("scroll", () => {
        const width = slider.clientWidth;
        const activeIndex = Math.round(slider.scrollLeft / width);
        const dotsList = dots.querySelectorAll(".media-dot");
        dotsList.forEach((dot, idx) => {
          dot.classList.toggle("active", idx === activeIndex);
        });
      });
    }

    // 3. Double-tap to Like gesture on media slider
    let lastTapTime = 0;
    slider.addEventListener("click", (e) => {
      // Ignore click if clicking info overlay or action buttons (which stopPropagation)
      const currentTime = new Date().getTime();
      const tapDelay = currentTime - lastTapTime;
      
      if (tapDelay < 300 && tapDelay > 0) {
        // Double tap triggered
        handleDoubleTapLike(product, item);
      }
      lastTapTime = currentTime;
    });

    // 4. Video mute button overlay if it has a video
    const hasVideo = product.media.some(m => m.type === "video");
    if (hasVideo) {
      const muteBtn = document.createElement("button");
      muteBtn.className = "video-mute-btn";
      muteBtn.type = "button";
      muteBtn.setAttribute("aria-label", "Mute video");
      muteBtn.innerHTML = globalMuted ? '<i class="bi bi-volume-mute-fill"></i>' : '<i class="bi bi-volume-up-fill"></i>';
      
      muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleGlobalMute();
      });
      item.append(muteBtn);
    }

    // 5. Product info overlay
    const infoOverlay = document.createElement("div");
    infoOverlay.className = "info-overlay";

    const category = document.createElement("div");
    category.className = "info-category";
    category.textContent = product.categoryName;

    const title = document.createElement("h2");
    title.className = "info-title";
    title.textContent = product.name;

    const priceRow = document.createElement("div");
    priceRow.className = "info-price-row";

    if (product.price) {
      const price = document.createElement("span");
      price.className = "info-price";
      price.textContent = `₹${product.price.toLocaleString("en-IN")}`;
      priceRow.append(price);
    }

    if (product.originalPrice && product.originalPrice > product.price) {
      const origPrice = document.createElement("span");
      origPrice.className = "info-original-price";
      origPrice.textContent = `₹${product.originalPrice.toLocaleString("en-IN")}`;
      
      const discountVal = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      const discount = document.createElement("span");
      discount.className = "info-discount";
      discount.textContent = `${discountVal}% OFF`;

      priceRow.append(origPrice, discount);
    }

    const desc = document.createElement("p");
    desc.className = "info-description";
    desc.textContent = product.description || "";

    infoOverlay.append(category, title, priceRow, desc);

    if (product.productCode) {
      const sku = document.createElement("div");
      sku.className = "info-sku";
      sku.textContent = `SKU: ${product.productCode}`;
      infoOverlay.append(sku);
    }

    item.append(infoOverlay);

    // 6. Right side action bar
    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";

    // Like Item
    const likeItem = document.createElement("div");
    likeItem.className = "action-item";
    
    const likeBtn = document.createElement("button");
    likeBtn.className = "action-btn";
    likeBtn.type = "button";
    likeBtn.setAttribute("aria-label", `Like ${product.name}`);
    
    const isLiked = A.isProductLiked(product.id);
    likeBtn.innerHTML = isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
    if (isLiked) likeBtn.classList.add("btn-liked");

    likeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const likedState = A.toggleLikeProduct(product.id);
      likeBtn.classList.toggle("btn-liked", likedState);
      likeBtn.innerHTML = likedState ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
    });

    const likeLabel = document.createElement("span");
    likeLabel.className = "action-label";
    likeLabel.textContent = "Like";

    likeItem.append(likeBtn, likeLabel);

    // Share Item
    const shareItem = document.createElement("div");
    shareItem.className = "action-item";

    const shareBtn = document.createElement("button");
    shareBtn.className = "action-btn";
    shareBtn.type = "button";
    shareBtn.setAttribute("aria-label", `Share ${product.name}`);
    shareBtn.innerHTML = '<i class="bi bi-share-fill"></i>';

    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      A.shareProduct(product, currentSeller, showToast);
    });

    const shareLabel = document.createElement("span");
    shareLabel.className = "action-label";
    shareLabel.textContent = "Share";

    shareItem.append(shareBtn, shareLabel);

    // WhatsApp Enquiry Item
    const waItem = document.createElement("div");
    waItem.className = "action-item";

    const waBtn = document.createElement("button");
    waBtn.className = "action-btn btn-whatsapp-action";
    waBtn.type = "button";
    waBtn.setAttribute("aria-label", `Enquire about ${product.name} on WhatsApp`);
    waBtn.innerHTML = '<i class="bi bi-whatsapp"></i>';

    waBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      A.openWhatsAppEnquiry(product, currentSeller);
    });

    const waLabel = document.createElement("span");
    waLabel.className = "action-label";
    waLabel.textContent = "Enquire";

    waItem.append(waBtn, waLabel);

    actionBar.append(likeItem, shareItem, waItem);
    item.append(actionBar);

    // Custom Double-tap Heart indicator
    const doubleTapHeart = document.createElement("div");
    doubleTapHeart.className = "double-tap-heart";
    doubleTapHeart.innerHTML = '<i class="bi bi-heart-fill"></i>';
    item.append(doubleTapHeart);

    return item;
  }

  /**
   * Handle double-tap to like visual and logical update
   */
  function handleDoubleTapLike(product, itemEl) {
    const likeBtn = itemEl.querySelector(".action-bar .action-btn");
    const isLiked = A.isProductLiked(product.id);
    
    // Only toggle to liked on double tap, don't unlike
    if (!isLiked) {
      A.toggleLikeProduct(product.id);
      likeBtn.classList.add("btn-liked");
      likeBtn.innerHTML = '<i class="bi bi-heart-fill"></i>';
    }

    // Trigger visual center heart animation
    const heartIndicator = itemEl.querySelector(".double-tap-heart");
    heartIndicator.classList.remove("animate");
    // trigger reflow
    void heartIndicator.offsetWidth;
    heartIndicator.classList.add("animate");
  }

  /**
   * Toggle audio globally and update all UI icons
   */
  function toggleGlobalMute() {
    globalMuted = !globalMuted;
    
    // Update active video if any
    if (activeVideo) {
      activeVideo.muted = globalMuted;
    }

    // Update icons in all buttons
    document.querySelectorAll(".video-mute-btn").forEach(btn => {
      btn.innerHTML = globalMuted ? '<i class="bi bi-volume-mute-fill"></i>' : '<i class="bi bi-volume-up-fill"></i>';
    });
    
    showToast(globalMuted ? "Audio muted" : "Audio unmuted");
  }

  /**
   * Setup IntersectionObserver to play/pause video on active slide
   */
  function setupVideoObserver() {
    const observerOptions = {
      root: feedContainer,
      rootMargin: "0px",
      threshold: 0.65 // Consider active when 65% is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const reel = entry.target;
        const video = reel.querySelector("video");
        
        if (entry.isIntersecting) {
          // Update product position indicator in header
          const index = Number(reel.dataset.index);
          productCounter.textContent = `${index + 1} / ${totalProducts}`;
          
          if (video) {
            activeVideo = video;
            video.muted = globalMuted;
            video.play().catch(err => {
              console.log("Autoplay blocked or interrupted:", err);
            });
          } else {
            activeVideo = null;
          }
        } else {
          // Pause if no longer visible
          if (video) {
            video.pause();
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll(".reel-item").forEach(item => {
      observer.observe(item);
    });
  }

  /**
   * Scroll to product matching deep link (e.g. #product-12)
   */
  function scrollToDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#product-")) {
      const pId = hash.replace("#product-", "");
      const targetElement = document.querySelector(`[data-product-id="${pId}"]`);
      if (targetElement) {
        // Wait briefly for rendering to settle
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: "instant" });
        }, 100);
      }
    }
  }

  /**
   * Initialize Showcase page
   */
  async function init() {
    const slug = getSellerSlug();
    
    try {
      // 1. Load sellers data
      const sellers = await D.loadSellers();
      currentSeller = sellers.find(s => s.slug === slug);
      
      if (!currentSeller) {
        renderStateScreen(
          "Seller Not Found",
          `The seller link "${slug}" does not exist in our directory.`,
          "Browse Other Sellers",
          () => { window.location.href = "index.html#sellers"; }
        );
        return;
      }

      // 2. Set seller identity in Header
      sellerName.textContent = currentSeller.name;
      sellerLogo.textContent = currentSeller.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      document.title = `${currentSeller.name} — Product Showcase`;

      // 3. Load seller's products
      productsList = await D.loadProducts(currentSeller.id);
      totalProducts = productsList.length;
      
      if (totalProducts === 0) {
        renderStateScreen(
          "Empty Catalogue",
          `${currentSeller.name} hasn't uploaded any products yet.`,
          "Go Back",
          () => { window.location.href = "index.html"; }
        );
        return;
      }

      // 4. Render Reels
      feedContainer.innerHTML = "";
      productsList.forEach((product, idx) => {
        const reelItem = createReelItem(product, idx);
        feedContainer.append(reelItem);
      });

      // 5. Setup Observer for Video Autoplay and Navigation
      setupVideoObserver();

      // 6. Deep linking
      scrollToDeepLink();
      window.addEventListener("hashchange", scrollToDeepLink);

    } catch (err) {
      console.error(err);
      renderStateScreen(
        "Loading Failed",
        "We couldn't retrieve the product catalogue. Please check your connection.",
        "Retry",
        () => { window.location.reload(); }
      );
    }
  }

  // Launch on load
  init();
})();
