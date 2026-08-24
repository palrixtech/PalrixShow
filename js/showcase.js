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
  let allProductsList = []; // stores all loaded products for current seller
  let productsList = []; // currently filtered products list
  let totalProducts = 0;
  let activeVideo = null;
  let globalMuted = true; // start muted by default
  let activeReelItem = null;
  let activeReelIndex = 0;
  let activeCategory = "all";
  let videoObserver = null;

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
    
    return seller || "palrix-fashion"; // default
  }

  /**
   * Render state screen for errors or empty search
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
  function createMediaDots(mediaLength, slider) {
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "media-dots";
    
    for (let index = 0; index < mediaLength; index++) {
      const dot = document.createElement("span");
      dot.className = `media-dot${index === 0 ? " active" : ""}`;
      
      // Allow navigation by clicking on dots
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const width = slider.clientWidth;
        slider.scrollTo({ left: index * width, behavior: "smooth" });
      });
      
      dotsWrap.append(dot);
    }
    
    return dotsWrap;
  }

  /**
   * Create a single product reel item markup and event listeners
   */
  function createReelItem(product, index) {
    let dots = null;
    const item = document.createElement("article");
    item.className = "reel-item";
    item.dataset.productId = product.id;
    item.dataset.index = index;

    // 1. Media Carousel Slider
    const slider = document.createElement("div");
    slider.className = "media-slider";

    product.media.forEach((m, idx) => {
      const slide = document.createElement("div");
      slide.className = "media-slide";

      // Background blur panel for aesthetic consistency
      const blurBg = document.createElement("div");
      blurBg.className = "media-blur-bg";
      blurBg.style.backgroundImage = `url('${m.url}')`;

      if (m.type === "video") {
        const video = document.createElement("video");
        video.className = "media-content";
        video.src = m.url;
        video.setAttribute("loop", "true");
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = globalMuted;
        
        slide.append(blurBg, video);
      } else {
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
      dots = createMediaDots(product.media.length, slider);

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
      const currentTime = new Date().getTime();
      const tapDelay = currentTime - lastTapTime;
      
      if (tapDelay < 300 && tapDelay > 0) {
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
    if (dots) {
      infoOverlay.prepend(dots);
    }

    // Floating Badge (e.g. New Arrival, Limited Stock)
    if (product.badge) {
      const badge = document.createElement("span");
      badge.className = `info-badge ${product.badgeClass || 'badge-new'}`;
      badge.textContent = product.badge;
      infoOverlay.append(badge);
    }

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

    const likeLabel = document.createElement("span");
    likeLabel.className = "action-label";
    likeLabel.textContent = A.getLikesCount(product.id, product.baseLikes);

    likeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const likedState = A.toggleLikeProduct(product.id);
      likeBtn.classList.toggle("btn-liked", likedState);
      likeBtn.innerHTML = likedState ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
      likeLabel.textContent = A.getLikesCount(product.id, product.baseLikes);
    });

    likeItem.append(likeBtn, likeLabel);

    // Share Item
    const shareItem = document.createElement("div");
    shareItem.className = "action-item";

    const shareBtn = document.createElement("button");
    shareBtn.className = "action-btn";
    shareBtn.type = "button";
    shareBtn.setAttribute("aria-label", `Share ${product.name}`);
    shareBtn.innerHTML = '<i class="bi bi-share-fill"></i>';

    const shareLabel = document.createElement("span");
    shareLabel.className = "action-label";
    shareLabel.textContent = A.getSharesCount(product.id, product.baseShares);

    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sliderEl = item.querySelector(".media-slider");
      const slideIndex = sliderEl ? Math.round(sliderEl.scrollLeft / sliderEl.clientWidth) : 0;
      A.shareProduct(product, currentSeller, slideIndex, showToast);
      shareLabel.textContent = A.getSharesCount(product.id, product.baseShares);
    });

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
      const sliderEl = item.querySelector(".media-slider");
      const slideIndex = sliderEl ? Math.round(sliderEl.scrollLeft / sliderEl.clientWidth) : 0;
      A.openWhatsAppEnquiry(product, currentSeller, slideIndex);
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
    const likeLabel = itemEl.querySelector(".action-bar .action-item:first-child .action-label");
    const isLiked = A.isProductLiked(product.id);
    
    // Only toggle to liked on double tap, don't unlike
    if (!isLiked) {
      A.toggleLikeProduct(product.id);
      likeBtn.classList.add("btn-liked");
      likeBtn.innerHTML = '<i class="bi bi-heart-fill"></i>';
      if (likeLabel) {
        likeLabel.textContent = A.getLikesCount(product.id, product.baseLikes);
      }
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
    // Disconnect old observer if exists
    if (videoObserver) {
      videoObserver.disconnect();
    }

    const observerOptions = {
      root: feedContainer,
      rootMargin: "0px",
      threshold: 0.65 // Consider active when 65% is visible
    };

    videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const reel = entry.target;
        const video = reel.querySelector("video");
        
        if (entry.isIntersecting) {
          // Update product position indicator in header
          const index = Number(reel.dataset.index);
          productCounter.textContent = `${index + 1} / ${totalProducts}`;
          
          activeReelItem = reel;
          activeReelIndex = index;
          
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
      videoObserver.observe(item);
    });
  }

  /**
   * Scroll to product matching deep link (e.g. #product-12)
   */
  function scrollToDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#product-")) {
      const parts = hash.replace("#product-", "").split("-");
      const pId = parts[0];
      const slideIndex = parts[1] ? Number(parts[1]) : 0;
      
      const targetElement = document.querySelector(`[data-product-id="${pId}"]`);
      if (targetElement) {
        // Wait briefly for rendering to settle
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: "instant" });
          
          // Scroll the horizontal slider to the active slide
          const slider = targetElement.querySelector(".media-slider");
          if (slider) {
            setTimeout(() => {
              const width = slider.clientWidth;
              slider.scrollTo({ left: slideIndex * width, behavior: "instant" });
            }, 100);
          }
        }, 100);
      }
    }
  }

  /**
   * Setup keyboard controls for desktop arrow key navigation
   */
  function setupKeyboardNavigation() {
    window.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); // Stop standard browser scrolling
        
        let nextIndex = activeReelIndex;
        if (e.key === "ArrowDown") {
          nextIndex = Math.min(totalProducts - 1, activeReelIndex + 1);
        } else {
          nextIndex = Math.max(0, activeReelIndex - 1);
        }
        
        if (nextIndex !== activeReelIndex) {
          const targetReel = document.querySelector(`[data-index="${nextIndex}"]`);
          if (targetReel) {
            targetReel.scrollIntoView({ behavior: "smooth" });
          }
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (!activeReelItem) return;
        
        const slider = activeReelItem.querySelector(".media-slider");
        if (slider) {
          e.preventDefault(); // Prevent standard horizontal page scrolling if any
          const width = slider.clientWidth;
          if (e.key === "ArrowRight") {
            slider.scrollTo({ left: slider.scrollLeft + width, behavior: "smooth" });
          } else {
            slider.scrollTo({ left: slider.scrollLeft - width, behavior: "smooth" });
          }
        }
      }
    });
  }

  /**
   * Render filtered products list
   */
  function renderReels() {
    feedContainer.innerHTML = "";
    
    if (productsList.length === 0) {
      renderStateScreen(
        "No Products",
        "No items found in this category.",
        "Show All",
        () => { setActiveCategory("all"); }
      );
      totalProducts = 0;
      productCounter.textContent = "0 / 0";
      return;
    }

    productsList.forEach((product, idx) => {
      const reelItem = createReelItem(product, idx);
      feedContainer.append(reelItem);
    });

    totalProducts = productsList.length;
    activeReelIndex = 0;
    activeReelItem = feedContainer.querySelector(".reel-item");
    productCounter.textContent = `1 / ${totalProducts}`;

    // Setup Video Autoplay and Scroll Observers
    setupVideoObserver();
  }

  /**
   * Set active category filter and re-render feed
   */
  function setActiveCategory(category) {
    activeCategory = category;
    
    // Update active tab styles
    const categoryBar = document.getElementById("categoryBar");
    if (categoryBar) {
      const tabs = categoryBar.querySelectorAll(".category-tab");
      tabs.forEach(tab => {
        const isActive = tab.dataset.filter === category;
        tab.classList.toggle("active", isActive);
        if (isActive) {
          tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      });
    }

    // Filter products list
    if (category === "all") {
      productsList = [...allProductsList];
    } else if (category === "new") {
      productsList = allProductsList.filter(p => p.isNewArrival);
    } else if (category === "stock") {
      productsList = allProductsList.filter(p => p.isLimitedStock);
    } else if (category === "sold") {
      productsList = allProductsList.filter(p => p.isMostSold);
    } else if (category === "liked") {
      productsList = allProductsList.filter(p => p.isMostLiked);
    }

    // Re-render feed items
    renderReels();

    // Reset scroll position to top reel item
    feedContainer.scrollTo({ top: 0, behavior: "instant" });
  }

  /**
   * Set up event listeners for category tabs
   */
  function setupCategoryFilter() {
    const categoryBar = document.getElementById("categoryBar");
    if (!categoryBar) return;

    const tabs = categoryBar.querySelectorAll(".category-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        const filter = tab.dataset.filter;
        setActiveCategory(filter);
      });
    });
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
          "Load Default Seller",
          () => { window.location.href = "index.html"; }
        );
        return;
      }

      // 2. Set seller identity in Header
      sellerName.textContent = currentSeller.name;
      sellerLogo.textContent = currentSeller.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      document.title = `${currentSeller.name} — Product Showcase`;

      // 3. Load seller's products
      allProductsList = await D.loadProducts(currentSeller.id);
      productsList = [...allProductsList];
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

      // 4. Show category bar and setup listeners
      const categoryBar = document.getElementById("categoryBar");
      if (categoryBar) {
        categoryBar.style.display = "flex";
        setupCategoryFilter();
      }

      // 5. Render filtered reels list
      renderReels();

      // 6. Setup Keyboard Controls for arrow keys
      setupKeyboardNavigation();

      // 7. Deep linking
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
