// === Cookie Consent Banner for AdSense Compliance ===
(function () {
  'use strict';

  // Skip if consent already given
  if (localStorage.getItem('cookie_consent') === 'accepted') return;

  // Determine base path for links (works from / or /guides/)
  var basePath = window.location.pathname.includes('/guides/') ? '..' : '.';

  // Create banner element
  var banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.innerHTML =
    '<div class="cc-inner">' +
    '<div class="cc-text">' +
    '🍪 本网站使用 Cookie 和 Google AdSense 来展示个性化广告。' +
    '继续使用即表示您同意我们的 <a href="' + basePath + '/privacy">隐私政策</a> 和 <a href="' + basePath + '/ad-disclosure">广告声明</a>。' +
    '您可以在 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google 广告设置</a> 中管理偏好。' +
    '</div>' +
    '<div class="cc-actions">' +
    '<button class="cc-btn cc-btn-settings" id="cc-settings-btn">管理设置</button>' +
    '<button class="cc-btn cc-btn-accept" id="cc-accept-btn">接受</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(banner);

  // Small delay for DOM to exist
  setTimeout(function () {
    banner.classList.add('cc-visible');
  }, 200);

  // Handle Accept
  document.getElementById('cc-accept-btn').addEventListener('click', function () {
    localStorage.setItem('cookie_consent', 'accepted');
    banner.classList.remove('cc-visible');
    setTimeout(function () {
      banner.remove();
      // AdSense Auto ads load from the head script; no manual push needed.
    }, 300);
  });

  // Handle Settings - redirect to ad disclosure
  document.getElementById('cc-settings-btn').addEventListener('click', function () {
    window.location.href = basePath + '/ad-disclosure';
  });
})();
