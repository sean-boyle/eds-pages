/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: diversity.rbc.com cleanup.
 * Selectors from captured DOM of https://diversity.rbc.com/
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Cookie consent banner (captured: div#onetrust-consent-sdk)
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
    ]);
    // Side menu overlay (captured: div.side-menu#side-menu-id)
    WebImporter.DOMUtils.remove(element, ['.side-menu']);
    // Search bar overlay (captured: div.search-bar#search-bar)
    WebImporter.DOMUtils.remove(element, ['#search-bar']);
    // High contrast test element (captured: div.high-contrast-test)
    WebImporter.DOMUtils.remove(element, ['.high-contrast-test']);
    // Tracking pixels and beacons (captured: div[id^="batBeacon"])
    const beacons = element.querySelectorAll('[id^="batBeacon"]');
    beacons.forEach((b) => b.remove());
  }

  if (hookName === H.after) {
    // Header and navigation (captured: header.n-search)
    WebImporter.DOMUtils.remove(element, ['header']);
    // Sticky nav bar (captured: div#sticky-wrapper .nav-bar)
    WebImporter.DOMUtils.remove(element, ['#sticky-wrapper']);
    // Footer (captured: footer > div.main-footer)
    WebImporter.DOMUtils.remove(element, ['footer']);
    // Discover More pagination button (captured: button.more-posts)
    WebImporter.DOMUtils.remove(element, ['button.more-posts', 'div.navigation.grid-wpr']);
    // jQuery autocomplete UI elements (captured: ul.ui-autocomplete)
    WebImporter.DOMUtils.remove(element, ['.ui-autocomplete', '.ui-helper-hidden-accessible']);
    // Noscript and iframes
    WebImporter.DOMUtils.remove(element, ['noscript', 'iframe', 'link']);
    // Share sidebar on articles (captured: div.article-secondary-column)
    WebImporter.DOMUtils.remove(element, ['.article-secondary-column']);
    // Disclaimer collapse on articles (captured: div.collapse-content#articleDisclaimer)
    WebImporter.DOMUtils.remove(element, ['.collapse-toggle', '.collapse-content']);
    // Wide images (duplicate mobile images) (captured: div.post-thumb.img-wide)
    WebImporter.DOMUtils.remove(element, ['.img-wide']);
    // Remove data-tracking attributes
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-track');
      el.removeAttribute('onclick');
    });
  }
}
