/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: RBC Royal Bank cleanup.
 * Removes non-authorable content (header, footer, nav, cookie consent, etc.)
 * Selectors from captured DOM of https://www.rbcroyalbank.com/personal.html
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Remove cookie consent banner (OneTrust) - found at #onetrust-consent-sdk
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
    ]);

    // Remove hero carousel navigation controls (non-authorable interactive UI)
    WebImporter.DOMUtils.remove(element, [
      '.hero-previews-container',
      '.hero-mobile-controls',
      '.hero-mobile-pause',
      '.hero-desktop-pause',
      '.hero-resume-btn',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove non-authorable site chrome
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'nav',
      'noscript',
      'iframe',
      'link',
      'script',
    ]);

    // Remove search form (non-authorable backend functionality)
    WebImporter.DOMUtils.remove(element, [
      'form#intellResponse_form',
    ]);

    // Clean tracking attributes
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-track');
      el.removeAttribute('data-analytics');
      el.removeAttribute('onclick');
      el.removeAttribute('data-ga');
    });
  }
}
