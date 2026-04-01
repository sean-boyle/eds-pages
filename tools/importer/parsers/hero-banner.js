/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-banner.
 * Base: hero. Source: https://diversity.rbc.com/rbc-volunteers-show-the-importance-of-black-mentorship/
 * Element is section.banner.html-bnr containing h1 title + hero image side by side.
 * Block library: hero has 1 column, 2 rows — row 1: background image, row 2: heading + text.
 * Hero-banner variant is CSS-only (no JS decoration).
 */
export default function parse(element, { document }) {
  // Row 1: Background image (from banner-img)
  const img = element.querySelector('.banner-img img, .ctm-width img');
  const imageFrag = document.createDocumentFragment();
  imageFrag.appendChild(document.createComment(' field:image '));
  if (img) {
    const picture = document.createElement('picture');
    const newImg = document.createElement('img');
    newImg.src = img.src;
    newImg.alt = img.alt || '';
    picture.appendChild(newImg);
    imageFrag.appendChild(picture);
  }

  // Row 2: Heading content (h1 from banner-text)
  const heading = element.querySelector('h1, h2, .banner-text h1, .banner-text h2');
  const contentFrag = document.createDocumentFragment();
  contentFrag.appendChild(document.createComment(' field:content '));
  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    contentFrag.appendChild(h1);
  }

  const cells = [
    [imageFrag],
    [contentFrag],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
