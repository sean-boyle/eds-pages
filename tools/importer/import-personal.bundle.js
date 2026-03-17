var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-personal.js
  var import_personal_exports = {};
  __export(import_personal_exports, {
    default: () => import_personal_default
  });

  // tools/importer/parsers/carousel-hero.js
  function parse(element, { document }) {
    const slides = element.querySelectorAll(":scope .hero-slide");
    const cells = [];
    slides.forEach((slide) => {
      const section = slide.querySelector("section");
      if (!section) return;
      const bgImg = section.querySelector(":scope > img") || section.querySelector(".banner-img-desktop img, .top-banner-img img") || section.querySelector(".img.desktop-only img, .img img") || section.querySelector(".mobile-bnr-img img");
      const headings = Array.from(section.querySelectorAll("h1, h2, h5"));
      const description = section.querySelector(
        "p.mobile-fs-16, p.rbcdisplay, p.text-white, p.h1-details, p.h1-subheading"
      );
      const ctaLinks = Array.from(section.querySelectorAll("a.btn, a.view-details"));
      const pill = section.querySelector(".pill, .cash-cta-pill");
      const contentCell = [];
      if (pill) contentCell.push(pill);
      headings.forEach((h) => contentCell.push(h));
      if (description) contentCell.push(description);
      contentCell.push(...ctaLinks);
      const imageCell = bgImg ? [bgImg] : [];
      cells.push([imageCell, contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, {
      name: "carousel-hero",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-services.js
  function parse2(element, { document }) {
    const columns = element.querySelectorAll(":scope > .grid-one-third");
    const row = [];
    columns.forEach((col) => {
      const cellContent = [];
      const heading = col.querySelector("h2");
      if (heading) cellContent.push(heading);
      const subheading = col.querySelector("h3:not(.h4)");
      if (subheading) cellContent.push(subheading);
      const desc = col.querySelector("p.lead, .callout-copy > p");
      if (desc) cellContent.push(desc);
      const img = col.querySelector(".callout-img img");
      if (img) cellContent.push(img);
      const links = col.querySelectorAll("ul.icon-list a, .flex-wpr a, .callout-link a, .goto-link");
      links.forEach((link) => cellContent.push(link));
      const inlineSubheadings = col.querySelectorAll(".flex-wpr h3");
      inlineSubheadings.forEach((h) => cellContent.push(h));
      row.push(cellContent);
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, {
      name: "columns-services",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-icons.js
  function parse3(element, { document }) {
    const items = element.querySelectorAll(":scope > li");
    const row = [];
    items.forEach((item) => {
      const cellContent = [];
      const icon = item.querySelector("img");
      if (icon) cellContent.push(icon);
      const link = item.querySelector("a");
      if (link) cellContent.push(link);
      if (cellContent.length > 0) {
        row.push(cellContent);
      }
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, {
      name: "columns-icons",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion-help.js
  function parse4(element, { document }) {
    const panels = element.querySelectorAll(".accordion-panel");
    const cells = [];
    panels.forEach((panel) => {
      const titleEl = panel.querySelector('.collapse-toggle, a[href^="#accordion"]');
      const title = titleEl ? titleEl.textContent.trim() : "";
      const contentEl = panel.querySelector(".collapse-content");
      const contentCell = [];
      if (contentEl) {
        const links = contentEl.querySelectorAll("a");
        if (links.length > 0) {
          const ul = document.createElement("ul");
          links.forEach((link) => {
            const li = document.createElement("li");
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
      name: "accordion-help",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-article.js
  function parse5(element, { document }) {
    const cards = element.querySelectorAll(":scope > .grid-one-third");
    const cells = [];
    cards.forEach((card) => {
      const img = card.querySelector("img");
      const heading = card.querySelector("h2, h3, h4, .callout-copy h2, .callout-copy h3");
      const link = card.querySelector("a");
      const imageCell = img ? [img] : [];
      const contentCell = [];
      if (heading) contentCell.push(heading);
      if (link && !heading) contentCell.push(link);
      cells.push([imageCell, contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, {
      name: "cards-article",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-locator.js
  function parse6(element, { document }) {
    const bgImg = element.querySelector(":scope > img, .branch-locator-bg img, .callout img");
    const heading = element.querySelector("h2, h1");
    const desc = element.querySelector("p, label");
    const cta = element.querySelector('a.btn, a[href*="maps"], a[href*="branch"]');
    const cells = [];
    if (bgImg) {
      cells.push([[bgImg]]);
    }
    const contentElements = [];
    if (heading) contentElements.push(heading);
    if (desc) contentElements.push(desc);
    if (cta) contentElements.push(cta);
    if (contentElements.length > 0) {
      cells.push([contentElements]);
    }
    const block = WebImporter.Blocks.createBlock(document, {
      name: "hero-locator",
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/transformers/rbc-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".hero-previews-container",
        ".hero-mobile-controls",
        ".hero-mobile-pause",
        ".hero-desktop-pause",
        ".hero-resume-btn"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        "nav",
        "noscript",
        "iframe",
        "link",
        "script"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "form#intellResponse_form"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("data-track");
        el.removeAttribute("data-analytics");
        el.removeAttribute("onclick");
        el.removeAttribute("data-ga");
      });
    }
  }

  // tools/importer/transformers/rbc-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const { document } = payload;
      const template = payload.template;
      if (!template || !template.sections || template.sections.length < 2) return;
      const sections = [...template.sections].reverse();
      sections.forEach((section) => {
        const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
        let sectionEl = null;
        for (const sel of selectors) {
          sectionEl = element.querySelector(sel);
          if (sectionEl) break;
        }
        if (!sectionEl) return;
        if (section.style) {
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.append(metaBlock);
        }
        const isFirst = section.id === template.sections[0].id;
        if (!isFirst && sectionEl.previousElementSibling) {
          const hr = document.createElement("hr");
          sectionEl.before(hr);
        }
      });
    }
  }

  // tools/importer/import-personal.js
  var parsers = {
    "carousel-hero": parse,
    "columns-services": parse2,
    "columns-icons": parse3,
    "accordion-help": parse4,
    "cards-article": parse5,
    "hero-locator": parse6
  };
  var PAGE_TEMPLATE = {
    name: "personal",
    description: "RBC Royal Bank personal banking homepage with hero carousel, product cards, customer service, help topics, articles, and branch locator",
    urls: [
      "https://www.rbcroyalbank.com/personal.html"
    ],
    blocks: [
      {
        name: "carousel-hero",
        instances: ["div.hero-carousel-container"]
      },
      {
        name: "columns-services",
        instances: ["main > section:not([class]) div.grid-wpr.eh-wpr"]
      },
      {
        name: "columns-icons",
        instances: ["section.help-section ul.col-wpr"]
      },
      {
        name: "accordion-help",
        instances: ["div.accordion#help-accordion"]
      },
      {
        name: "cards-article",
        instances: ["section.discover-and-learn-section div.grid-wpr.eh-wpr"]
      },
      {
        name: "hero-locator",
        instances: ["section.branch-locator-section"]
      }
    ],
    sections: [
      {
        id: "section-1-hero-carousel",
        name: "Hero Carousel",
        selector: "main > div.banner-container",
        style: null,
        blocks: ["carousel-hero"],
        defaultContent: []
      },
      {
        id: "section-2-welcome",
        name: "Welcome and Products",
        selector: ["main > section:not([class])", "main > section:nth-of-type(1)"],
        style: null,
        blocks: ["columns-services"],
        defaultContent: [
          "main > section:not([class]) h1",
          "main > section:not([class]) > div.section-inner > p"
        ]
      },
      {
        id: "section-3-help",
        name: "Help Topics",
        selector: "section.help-section",
        style: null,
        blocks: ["columns-icons", "accordion-help"],
        defaultContent: [
          "section.help-section h2",
          "form#intellResponse_form"
        ]
      },
      {
        id: "section-4-articles",
        name: "My Money Matters",
        selector: "section.discover-and-learn-section",
        style: null,
        blocks: ["cards-article"],
        defaultContent: [
          "section.discover-and-learn-section h2",
          "section.discover-and-learn-section > div.section-inner > p",
          "section.discover-and-learn-section div.text-center"
        ]
      },
      {
        id: "section-5-branch-locator",
        name: "Branch Locator",
        selector: "section.branch-locator-section",
        style: "dark",
        blocks: ["hero-locator"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
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
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_personal_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_personal_exports);
})();
