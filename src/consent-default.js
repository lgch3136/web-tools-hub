// Establish Google Consent Mode before any advertising script runs.
(function () {
  'use strict';

  var stored = '';
  try {
    stored = localStorage.getItem('cookie_consent') || '';
  } catch (_) {
    stored = '';
  }

  var granted = stored === 'accepted';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
})();
