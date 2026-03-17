/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-locator.
 * Base: hero. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Hero block: row 1 = [background image], row 2 = [text content in single cell].
 * Extracts branch/ATM locator section with background image and overlay content.
 */
export default function parse(element, { document }) {
  // Extract background image - try img element or CSS background
  const bgImg = element.querySelector(':scope > img, .branch-locator-bg img, .callout img');

  // Extract heading
  const heading = element.querySelector('h2, h1');

  // Extract description/label text
  const desc = element.querySelector('p, label');

  // Extract CTA link/button - prefer link over button for static content
  const cta = element.querySelector('a.btn, a[href*="maps"], a[href*="branch"]');

  const cells = [];

  // Row 1: background image (single cell)
  if (bgImg) {
    cells.push([[bgImg]]);
  }

  // Row 2: all text content combined in single cell
  const contentElements = [];
  if (heading) contentElements.push(heading);
  if (desc) contentElements.push(desc);
  if (cta) contentElements.push(cta);

  if (contentElements.length > 0) {
    cells.push([contentElements]);
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'hero-locator',
    cells,
  });
  element.replaceWith(block);
}
