/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-article.
 * Base: cards. Source: https://diversity.rbc.com/
 * Element is the parent container (.section-inner.article-blocks or .section-inner).
 * Extracts article cards from grid layout (div.grid-one-third items).
 * Block library: 2 columns per row — image | content.
 * xwalk model: card group (multi) with image + content fields.
 */
export default function parse(element, { document }) {
  const cards = element.querySelectorAll('.grid-one-third');
  const cells = [];

  cards.forEach((card) => {
    // Column 1: Image
    const img = card.querySelector('.post-thumb.img-std img, .callout-img.img-std img');
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

    // Column 2: Content (title + date + excerpt + link)
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(' field:content '));

    const title = card.querySelector('h4');
    if (title) {
      const h = document.createElement('h4');
      h.textContent = title.textContent.trim();
      contentFrag.appendChild(h);
    }

    const date = card.querySelector('.text-script');
    if (date) {
      const p = document.createElement('p');
      p.textContent = date.textContent.trim();
      contentFrag.appendChild(p);
    }

    const excerpt = card.querySelector('.post-excerpt');
    if (excerpt) {
      const p = document.createElement('p');
      p.textContent = excerpt.textContent.trim();
      contentFrag.appendChild(p);
    }

    const link = card.querySelector('a.post, a.link');
    if (link && link.href) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = 'View More';
      const p = document.createElement('p');
      p.appendChild(a);
      contentFrag.appendChild(p);
    }

    cells.push([imageFrag, contentFrag]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells });
  element.replaceWith(block);
}
