// === Cookie Consent Banner for AdSense Compliance ===
(function () {
  'use strict';

  var stored = localStorage.getItem('cookie_consent');
  if (stored === 'accepted' || stored === 'acknowledged') return;

  var basePath = window.location.pathname.includes('/guides/') ? '..' : '.';
  var banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie 提示');
  banner.innerHTML =
    '<div class="cc-inner">' +
    '<div class="cc-text">' +
    '<strong>Cookie 提示</strong>：用于记住偏好和展示广告。' +
    '详情见 <a href="' + basePath + '/privacy">隐私政策</a>、<a href="' + basePath + '/ad-disclosure">广告声明</a>。' +
    '</div>' +
    '<div class="cc-actions">' +
    '<a class="cc-link" href="' + basePath + '/ad-disclosure">管理偏好</a>' +
    '<button class="cc-btn cc-btn-accept" id="cc-accept-btn">同意并继续</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(banner);

  setTimeout(function () {
    banner.classList.add('cc-visible');
  }, 1600);

  document.getElementById('cc-accept-btn').addEventListener('click', function () {
    localStorage.setItem('cookie_consent', 'accepted');
    banner.classList.remove('cc-visible');
    setTimeout(function () {
      banner.remove();
      // AdSense Auto Ads load from the head script; no manual push needed.
    }, 300);
  });
})();
