/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-help.
 * Base: accordion. Source: https://www.rbcroyalbank.com/personal.html
 * Generated: 2026-03-17
 *
 * Accordion block: each row = [title, content].
 * Extracts help topics from div.accordion#help-accordion > div.grid-wpr accordion panels.
 */
export default function parse(element, { document }) {
  const panels = element.querySelectorAll('.accordion-panel');
  const cells = [];

  panels.forEach((panel) => {
    // Extract title from collapse-toggle link
    const titleEl = panel.querySelector('.collapse-toggle, a[href^="#accordion"]');
    const title = titleEl ? titleEl.textContent.trim() : '';

    // Extract content (list of links inside collapse-content)
    const contentEl = panel.querySelector('.collapse-content');
    const contentCell = [];

    if (contentEl) {
      // Get the list of links
      const links = contentEl.querySelectorAll('a');
      if (links.length > 0) {
        const ul = document.createElement('ul');
        links.forEach((link) => {
          const li = document.createElement('li');
          li.append(link.cloneNode(true));
          ul.append(li);
        });
        contentCell.push(ul);
      }
    }

    if (title) {
      cells.push([[title], contentCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'accordion-help',
    cells,
  });
  element.replaceWith(block);
}
