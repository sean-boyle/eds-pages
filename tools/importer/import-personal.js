/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsServicesParser from './parsers/columns-services.js';
import columnsIconsParser from './parsers/columns-icons.js';
import accordionHelpParser from './parsers/accordion-help.js';
import cardsArticleParser from './parsers/cards-article.js';
import heroLocatorParser from './parsers/hero-locator.js';

// TRANSFORMER IMPORTS
import rbcCleanupTransformer from './transformers/rbc-cleanup.js';
import rbcSectionsTransformer from './transformers/rbc-sections.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-services': columnsServicesParser,
  'columns-icons': columnsIconsParser,
  'accordion-help': accordionHelpParser,
  'cards-article': cardsArticleParser,
  'hero-locator': heroLocatorParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'personal',
  description: 'RBC Royal Bank personal banking homepage with hero carousel, product cards, customer service, help topics, articles, and branch locator',
  urls: [
    'https://www.rbcroyalbank.com/personal.html',
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: ['div.hero-carousel-container'],
    },
    {
      name: 'columns-services',
      instances: ['main > section:not([class]) div.grid-wpr.eh-wpr'],
    },
    {
      name: 'columns-icons',
      instances: ['section.help-section ul.col-wpr'],
    },
    {
      name: 'accordion-help',
      instances: ['div.accordion#help-accordion'],
    },
    {
      name: 'cards-article',
      instances: ['section.discover-and-learn-section div.grid-wpr.eh-wpr'],
    },
    {
      name: 'hero-locator',
      instances: ['section.branch-locator-section'],
    },
  ],
  sections: [
    {
      id: 'section-1-hero-carousel',
      name: 'Hero Carousel',
      selector: 'main > div.banner-container',
      style: null,
      blocks: ['carousel-hero'],
      defaultContent: [],
    },
    {
      id: 'section-2-welcome',
      name: 'Welcome and Products',
      selector: ['main > section:not([class])', 'main > section:nth-of-type(1)'],
      style: null,
      blocks: ['columns-services'],
      defaultContent: [
        'main > section:not([class]) h1',
        'main > section:not([class]) > div.section-inner > p',
      ],
    },
    {
      id: 'section-3-help',
      name: 'Help Topics',
      selector: 'section.help-section',
      style: null,
      blocks: ['columns-icons', 'accordion-help'],
      defaultContent: [
        'section.help-section h2',
        'form#intellResponse_form',
      ],
    },
    {
      id: 'section-4-articles',
      name: 'My Money Matters',
      selector: 'section.discover-and-learn-section',
      style: null,
      blocks: ['cards-article'],
      defaultContent: [
        'section.discover-and-learn-section h2',
        'section.discover-and-learn-section > div.section-inner > p',
        'section.discover-and-learn-section div.text-center',
      ],
    },
    {
      id: 'section-5-branch-locator',
      name: 'Branch Locator',
      selector: 'section.branch-locator-section',
      style: 'dark',
      blocks: ['hero-locator'],
      defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY
const transformers = [
  rbcCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [rbcSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
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

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

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
