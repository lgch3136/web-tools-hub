// Advertising disclosure and opt-in controls for pages that carry AdSense code.
(function () {
  'use strict';

  var advertisingPlaceholder = document.querySelector('[data-ad-client-script]');
  var legacyAdvertising = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  if (!advertisingPlaceholder && !legacyAdvertising) return;

  function readStoredChoice() {
    try {
      return localStorage.getItem('cookie_consent') || '';
    } catch (_) {
      return '';
    }
  }

  function updateConsent(granted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
        analytics_storage: 'denied',
      });
    }
  }

  function loadAdvertising() {
    if (!advertisingPlaceholder || document.querySelector('script[data-ad-client-loaded]')) return;
    var source = advertisingPlaceholder.getAttribute('data-ad-client-script');
    if (!source) return;
    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = source;
    script.setAttribute('data-ad-client-loaded', 'true');
    advertisingPlaceholder.insertAdjacentElement('afterend', script);
  }

  var stored = readStoredChoice();
  if (stored === 'accepted') {
    updateConsent(true);
    loadAdvertising();
    return;
  }
  if (stored === 'essential') {
    updateConsent(false);
    return;
  }

  var basePath = window.location.pathname.includes('/guides/') ? '..' : '.';
  var banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', '广告 Cookie 设置');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML =
    '<div class="cc-inner">' +
    '<div class="cc-text">' +
    '<strong>广告与 Cookie 设置</strong>：本内容页可加载 Google 广告。“仅必要”不会加载广告服务；同意后才会启用广告存储、广告用户数据和个性化。' +
    '详情见 <a href="' + basePath + '/privacy">隐私政策</a>、<a href="' + basePath + '/ad-disclosure">广告声明</a>。' +
    '</div>' +
    '<div class="cc-actions">' +
    '<button class="cc-btn cc-btn-essential" id="cc-essential-btn">仅必要</button>' +
    '<button class="cc-btn cc-btn-accept" id="cc-accept-btn">同意广告 Cookie</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(banner);
  window.setTimeout(function () {
    banner.classList.add('cc-visible');
  }, 350);

  function saveChoice(choice) {
    try {
      localStorage.setItem('cookie_consent', choice);
    } catch (_) {
      // The current-page choice still applies when storage is unavailable.
    }
    var accepted = choice === 'accepted';
    updateConsent(accepted);
    if (accepted) loadAdvertising();
    banner.classList.remove('cc-visible');
    window.setTimeout(function () {
      banner.remove();
    }, 300);
  }

  document.getElementById('cc-essential-btn').addEventListener('click', function () {
    saveChoice('essential');
  });
  document.getElementById('cc-accept-btn').addEventListener('click', function () {
    saveChoice('accepted');
  });
})();
