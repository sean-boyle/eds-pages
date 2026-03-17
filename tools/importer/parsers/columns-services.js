/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-services.
 * Base: columns. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Columns block: single row with N columns.
 * Extracts 3 service cards from div.grid-wpr.eh-wpr > div.grid-one-third.
 */
export default function parse(element, { document }) {
  const columns = element.querySelectorAll(':scope > .grid-one-third');
  const row = [];

  columns.forEach((col) => {
    const cellContent = [];

    // Extract heading
    const heading = col.querySelector('h2');
    if (heading) cellContent.push(heading);

    // Extract subheading (e.g. "Chat with Us!")
    const subheading = col.querySelector('h3:not(.h4)');
    if (subheading) cellContent.push(subheading);

    // Extract description paragraph
    const desc = col.querySelector('p.lead, .callout-copy > p');
    if (desc) cellContent.push(desc);

    // Extract image if present (e.g. mobile app card)
    const img = col.querySelector('.callout-img img');
    if (img) cellContent.push(img);

    // Extract link lists
    const links = col.querySelectorAll('ul.icon-list a, .flex-wpr a, .callout-link a, .goto-link');
    links.forEach((link) => cellContent.push(link));

    // Extract additional subheadings within link lists (e.g. "Benefits of Digital Banking:")
    const inlineSubheadings = col.querySelectorAll('.flex-wpr h3');
    inlineSubheadings.forEach((h) => cellContent.push(h));

    row.push(cellContent);
  });

  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'columns-services',
    cells,
  });
  element.replaceWith(block);
}
