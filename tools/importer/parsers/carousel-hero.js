/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero.
 * Base: carousel. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Carousel block: each row = [image, content].
 * Extracts hero slides from div.hero-carousel-container > div.hero-slides > div.hero-slide.
 */
export default function parse(element, { document }) {
  const slides = element.querySelectorAll(':scope .hero-slide');
  const cells = [];

  slides.forEach((slide) => {
    const section = slide.querySelector('section');
    if (!section) return;

    // Extract background/hero image - try multiple patterns
    // Pattern 1: direct img child of section (slides 2, 3, 5)
    // Pattern 2: desktop image in nested div (slides 1, 4)
    // Pattern 3: any prominent img in the section
    const bgImg = section.querySelector(':scope > img')
      || section.querySelector('.banner-img-desktop img, .top-banner-img img')
      || section.querySelector('.img.desktop-only img, .img img')
      || section.querySelector('.mobile-bnr-img img');

    // Extract all headings (some slides have h5 + h2)
    const headings = Array.from(section.querySelectorAll('h1, h2, h5'));

    // Extract description paragraph
    const description = section.querySelector(
      'p.mobile-fs-16, p.rbcdisplay, p.text-white, p.h1-details, p.h1-subheading'
    );

    // Extract CTA links
    const ctaLinks = Array.from(section.querySelectorAll('a.btn, a.view-details'));

    // Extract pill/badge
    const pill = section.querySelector('.pill, .cash-cta-pill');

    // Build content cell
    const contentCell = [];
    if (pill) contentCell.push(pill);
    headings.forEach((h) => contentCell.push(h));
    if (description) contentCell.push(description);
    contentCell.push(...ctaLinks);

    // Build row: [image, content]
    const imageCell = bgImg ? [bgImg] : [];
    cells.push([imageCell, contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'carousel-hero',
    cells,
  });
  element.replaceWith(block);
}
