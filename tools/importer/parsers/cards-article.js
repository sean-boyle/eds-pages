/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-article.
 * Base: cards. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Cards block: each row = [image, content].
 * Extracts article preview cards from section.discover-and-learn-section div.grid-wpr.eh-wpr > div.grid-one-third.
 */
export default function parse(element, { document }) {
  const cards = element.querySelectorAll(':scope > .grid-one-third');
  const cells = [];

  cards.forEach((card) => {
    // Extract article image
    const img = card.querySelector('img');

    // Extract article title/heading
    const heading = card.querySelector('h2, h3, h4, .callout-copy h2, .callout-copy h3');

    // Extract article link
    const link = card.querySelector('a');

    // Build image cell
    const imageCell = img ? [img] : [];

    // Build content cell - title wrapped in link if available
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (link && !heading) contentCell.push(link);

    cells.push([imageCell, contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'cards-article',
    cells,
  });
  element.replaceWith(block);
}
