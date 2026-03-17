/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-icons.
 * Base: columns. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Columns block: single row with 4 columns.
 * Extracts quick-link icons from ul.col-wpr > li, each with icon image and linked text.
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll(':scope > li');
  const row = [];

  items.forEach((item) => {
    const cellContent = [];

    // Extract icon image
    const icon = item.querySelector('img');
    if (icon) cellContent.push(icon);

    // Extract linked text
    const link = item.querySelector('a');
    if (link) cellContent.push(link);

    if (cellContent.length > 0) {
      row.push(cellContent);
    }
  });

  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'columns-icons',
    cells,
  });
  element.replaceWith(block);
}
