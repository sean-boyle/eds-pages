/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import cardsArticleParser from './parsers/cards-article.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/diversity-rbc-cleanup.js';
import sectionsTransformer from './transformers/diversity-rbc-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'cards-article': cardsArticleParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'article',
  description: 'Individual diversity story/article page with hero image, article body content, and related stories',
  urls: [],
  blocks: [
    {
      name: 'hero-banner',
      instances: ['section.banner.html-bnr']
    },
    {
      name: 'cards-article',
      instances: ['section.read-this-next .section-inner']
    }
  ],
  sections: [
    {
      id: 'section-1-hero-banner',
      name: 'Hero Banner',
      selector: 'section.banner.html-bnr',
      style: null,
      blocks: ['hero-banner'],
      defaultContent: []
    },
    {
      id: 'section-2-article-body',
      name: 'Article Body',
      selector: 'main > section:nth-of-type(2)',
      style: null,
      blocks: [],
      defaultContent: [
        '.article-content p',
        '.article-content .img-description',
        '.article-secondary-column .text-script'
      ]
    },
    {
      id: 'section-3-related-articles',
      name: 'Related Articles',
      selector: 'section.read-this-next.article-blocks',
      style: 'grey',
      blocks: ['cards-article'],
      defaultContent: ['section.read-this-next h3']
    }
  ]
};

// TRANSFORMER REGISTRY — include sections transformer since template has 3 sections
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. Find and parse blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name}:`, e);
        }
      }
    });

    // 3. afterTransform cleanup + section breaks
    executeTransformers('afterTransform', main, payload);

    // 4. Built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Generate path
    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath || '/index');

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
