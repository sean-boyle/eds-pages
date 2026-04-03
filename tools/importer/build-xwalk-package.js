#!/usr/bin/env node

/**
 * Build AEM Package with proper xwalk JCR structure.
 * Each block becomes its own component node with correct sling:resourceType.
 *
 * Structure:
 *   page/jcr:content/root/
 *     section-0/  (sling:resourceType=core/franklin/components/section/v1/section)
 *       block-0/  (sling:resourceType=core/franklin/components/block/v1/block)
 *         name="Hero Banner", model="hero-banner"
 *         item0/ (image, content properties)
 *       text-0/   (sling:resourceType=core/franklin/components/text/v1/text)
 *         text="<p>paragraph...</p>"
 *     section-1/  (style="grey")
 *       block-0/  (sling:resourceType=core/franklin/components/block/v1/block)
 *         name="Cards Article", model="cards-article"
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const siteName = 'eds-pages';
const contentDir = path.resolve(__dirname, '../../content');
const imagesDir = path.resolve(__dirname, '../../migration-work/dam-images');
const imageUrlFile = path.resolve(__dirname, '../../migration-work/image-urls.txt');
const damRoot = 'eds-pages/diversity';
const outputZip = path.resolve(__dirname, 'diversity-rbc-xwalk-package.zip');
const buildDir = path.resolve(__dirname, '_xwalk-build');
const now = new Date().toISOString();

// Block name mapping: CSS class -> UE display name and model ID
const BLOCK_MAP = {
  'hero-banner': { displayName: 'Hero Banner', model: 'hero-banner' },
  'cards-article': { displayName: 'Cards Article', model: 'cards-article' },
  'section-metadata': null, // handled specially
  'metadata': null, // handled specially
};

// Clean
if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });

const vaultDir = path.join(buildDir, 'META-INF', 'vault');
const jcrContent = path.join(buildDir, 'jcr_root', 'content', siteName);
const jcrDam = path.join(buildDir, 'jcr_root', 'content', 'dam', damRoot);
fs.mkdirSync(vaultDir, { recursive: true });
fs.mkdirSync(jcrContent, { recursive: true });
fs.mkdirSync(jcrDam, { recursive: true });

// Vault metadata
fs.writeFileSync(path.join(vaultDir, 'properties.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <entry key="name">diversity-rbc-xwalk-package</entry>
  <entry key="version">2.0.0</entry>
  <entry key="group">eds-migration</entry>
  <entry key="description">Migrated content with proper xwalk JCR structure from diversity.rbc.com</entry>
  <entry key="createdBy">eds-migration</entry>
  <entry key="created">${now}</entry>
  <entry key="packageType">mixed</entry>
</properties>
`);

fs.writeFileSync(path.join(vaultDir, 'filter.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="/content/${siteName}"/>
  <filter root="/content/dam/${damRoot}"/>
</workspaceFilter>
`);

fs.writeFileSync(path.join(vaultDir, 'config.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<vaultfs version="1.1">
  <aggregates/>
  <handlers/>
</vaultfs>
`);

// URL -> DAM mapping
const urlToDam = {};
if (fs.existsSync(imageUrlFile)) {
  const imageUrls = fs.readFileSync(imageUrlFile, 'utf8').trim().split('\n');
  for (const url of imageUrls) {
    const filename = path.basename(url).replace(/[?#].*/, '');
    urlToDam[url] = `/content/dam/${damRoot}/${filename}`;
  }
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function replaceImageUrls(html) {
  let result = html;
  for (const [url, damPath] of Object.entries(urlToDam)) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), damPath);
  }
  return result;
}

/**
 * Parse a .plain.html file into sections with their child elements.
 * Each top-level <div> = one section.
 * Inside each section: blocks (div.classname) or default content (p, h1-h6, etc.)
 */
function parsePage(html) {
  const sections = [];
  const metadata = {};

  // Split into top-level divs (each line in .plain.html is a section div)
  const lines = html.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('<div>')) continue;

    // Check for metadata block
    const metaMatch = trimmed.match(/<div class="metadata">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
    if (metaMatch) {
      const rows = metaMatch[1].matchAll(/<div><div>(.*?)<\/div><div>([\s\S]*?)<\/div><\/div>/g);
      for (const row of rows) {
        const key = row[1].trim().toLowerCase();
        const value = row[2].replace(/<[^>]+>/g, '').trim();
        if (key && value) metadata[key] = value;
      }
      continue;
    }

    // Parse section content
    const section = { style: null, children: [] };
    const inner = trimmed.slice(5, -6); // strip outer <div></div>

    // Check for section-metadata
    const sectionMetaMatch = inner.match(/<div class="section-metadata"><div><div>style<\/div><div>(.*?)<\/div><\/div><\/div>/);
    if (sectionMetaMatch) {
      section.style = sectionMetaMatch[1].trim();
    }

    // Find blocks (div with class)
    const blockRegex = /<div class="([^"]+)">([\s\S]*?)(?=<div class="(?:section-metadata|metadata)")|<div class="([^"]+)">([\s\S]*?)<\/div>(?:\s*<div class="section-metadata">|$)/;

    // Simpler approach: find all block-class divs and default content
    // Look for block patterns
    const blockMatches = inner.matchAll(/<div class="((?!section-metadata|metadata)[^"]+)">([\s\S]*?)<\/div>(?=\s*(?:<div class="|$))/g);
    let hasBlocks = false;

    for (const match of blockMatches) {
      const className = match[1];
      if (BLOCK_MAP[className] !== undefined) {
        if (BLOCK_MAP[className] !== null) {
          section.children.push({
            type: 'block',
            blockClass: className,
            blockName: BLOCK_MAP[className].displayName,
            model: BLOCK_MAP[className].model,
            html: match[2]
          });
          hasBlocks = true;
        }
      }
    }

    // If no recognized blocks found, treat remaining content as default text
    if (!hasBlocks) {
      // Strip any block divs and section-metadata, keep the rest as text
      let textContent = inner
        .replace(/<div class="section-metadata">[\s\S]*?<\/div>\s*<\/div>/g, '')
        .replace(/<div class="metadata">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '')
        .trim();

      if (textContent) {
        section.children.push({ type: 'text', html: textContent });
      }
    } else {
      // Check for default content mixed with blocks (e.g., article body text before/after blocks)
      // Extract content that's NOT inside a recognized block div
      let remaining = inner;
      for (const child of section.children) {
        if (child.type === 'block') {
          const blockHtml = `<div class="${child.blockClass}">${child.html}</div>`;
          remaining = remaining.replace(blockHtml, '|||BLOCK|||');
        }
      }
      remaining = remaining.replace(/<div class="section-metadata">[\s\S]*?<\/div>\s*<\/div>/g, '');

      // Split remaining by block markers and interleave
      const parts = remaining.split('|||BLOCK|||');
      const newChildren = [];
      let blockIdx = 0;

      for (let i = 0; i < parts.length; i++) {
        const text = parts[i].trim();
        if (text) {
          newChildren.push({ type: 'text', html: text });
        }
        if (blockIdx < section.children.length) {
          newChildren.push(section.children[blockIdx]);
          blockIdx++;
        }
      }
      // Add remaining blocks
      while (blockIdx < section.children.length) {
        newChildren.push(section.children[blockIdx]);
        blockIdx++;
      }

      section.children = newChildren;
    }

    if (section.children.length > 0) {
      sections.push(section);
    }
  }

  return { sections, metadata };
}

/**
 * Generate .content.xml for a page with proper xwalk component nodes.
 */
function generatePageXml(pageName, sections, metadata) {
  const title = metadata.title || metadata['og:title'] || pageName.replace(/-/g, ' ');
  const description = metadata.description || '';

  let sectionNodes = '';

  sections.forEach((section, sIdx) => {
    let childNodes = '';
    let childIdx = 0;

    section.children.forEach((child) => {
      if (child.type === 'block') {
        // Block component node
        childNodes += `
        <block_${childIdx}
            jcr:primaryType="nt:unstructured"
            sling:resourceType="core/franklin/components/block/v1/block"
            name="${escapeXml(child.blockName)}"
            model="${escapeXml(child.model)}"
            jcr:title="${escapeXml(child.blockName)}">`;

        // Parse block rows into child items
        const rowMatches = child.html.matchAll(/<div><div>([\s\S]*?)<\/div><div>([\s\S]*?)<\/div><\/div>/g);
        let itemIdx = 0;
        for (const row of rowMatches) {
          const col1 = replaceImageUrls(row[1].trim());
          const col2 = replaceImageUrls(row[2].trim());
          childNodes += `
          <item${itemIdx}
              jcr:primaryType="nt:unstructured"
              image="${escapeXml(col1.replace(/<!-- field:image -->/, '').replace(/<[^>]+>/g, '').trim())}"
              content="${escapeXml(col2.replace(/<!-- field:content -->/, '').trim())}"/>`;
          itemIdx++;
        }

        // If no row matches (e.g., hero-banner with separate row divs)
        if (itemIdx === 0) {
          const allDivs = child.html.matchAll(/<div><div>([\s\S]*?)<\/div><\/div>/g);
          let heroItems = [];
          for (const d of allDivs) {
            heroItems.push(d[1].trim());
          }
          if (heroItems.length >= 2) {
            const imageContent = replaceImageUrls(heroItems[0].replace(/<!-- field:image -->/, '').trim());
            const textContent = replaceImageUrls(heroItems[1].replace(/<!-- field:content -->/, '').trim());
            childNodes += `
          <item0
              jcr:primaryType="nt:unstructured"
              image="${escapeXml(imageContent.replace(/<[^>]+>/g, '').trim())}"
              content="${escapeXml(textContent)}"/>`;
          }
        }

        childNodes += `
        </block_${childIdx}>`;
      } else {
        // Text/default content node
        const textHtml = replaceImageUrls(child.html);
        childNodes += `
        <text_${childIdx}
            jcr:primaryType="nt:unstructured"
            sling:resourceType="core/franklin/components/text/v1/text"
            text="${escapeXml(textHtml)}"/>`;
      }
      childIdx++;
    });

    const styleAttr = section.style ? `\n            style="${escapeXml(section.style)}"` : '';

    sectionNodes += `
      <section_${sIdx}
          jcr:primaryType="nt:unstructured"
          sling:resourceType="core/franklin/components/section/v1/section"${styleAttr}>${childNodes}
      </section_${sIdx}>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
      jcr:primaryType="cq:PageContent"
      jcr:title="${escapeXml(title)}"
      jcr:description="${escapeXml(description)}"
      sling:resourceType="core/franklin/components/page/v1/page"
      cq:lastModified="${now}">
    <root
        jcr:primaryType="nt:unstructured"
        sling:resourceType="core/franklin/components/root/v1/root">${sectionNodes}
    </root>
  </jcr:content>
</jcr:root>
`;
}

// --- Site root ---
fs.writeFileSync(path.join(jcrContent, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="sling:OrderedFolder"
          jcr:title="RBC Diversity"/>
`);

// --- Process pages ---
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.plain.html')).sort();
let pageCount = 0;

console.log(`Building xwalk package from ${files.length} content files...\n`);

for (const file of files) {
  const pageName = file.replace('.plain.html', '');
  const html = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const { sections, metadata } = parsePage(html);

  const pageDir = path.join(jcrContent, pageName);
  fs.mkdirSync(pageDir, { recursive: true });

  const xml = generatePageXml(pageName, sections, metadata);
  fs.writeFileSync(path.join(pageDir, '.content.xml'), xml);

  const sectionInfo = sections.map((s, i) => {
    const blocks = s.children.filter(c => c.type === 'block').map(c => c.blockClass);
    const texts = s.children.filter(c => c.type === 'text').length;
    return `S${i}(${blocks.length ? blocks.join('+') : texts + ' text'}${s.style ? ',style:' + s.style : ''})`;
  }).join(' | ');

  console.log(`  [${pageCount + 1}/${files.length}] ${pageName}: ${sectionInfo}`);
  pageCount++;
}

// --- Copy DAM assets ---
let assetCount = 0;
if (fs.existsSync(imagesDir)) {
  const imageFiles = fs.readdirSync(imagesDir);
  for (const filename of imageFiles) {
    const filePath = path.join(imagesDir, filename);
    if (!fs.statSync(filePath).isFile()) continue;

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    const assetDir = path.join(jcrDam, filename);
    const renditionsDir = path.join(assetDir, 'jcr:content', 'renditions');
    const originalDir = path.join(renditionsDir, 'original.dir');
    fs.mkdirSync(originalDir, { recursive: true });

    fs.writeFileSync(path.join(assetDir, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:dam="http://www.day.com/dam/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent">
    <metadata jcr:primaryType="nt:unstructured" dc:format="${mimeType}"/>
  </jcr:content>
</jcr:root>
`);

    fs.copyFileSync(filePath, path.join(renditionsDir, 'original'));
    fs.writeFileSync(path.join(originalDir, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="nt:resource" jcr:mimeType="${mimeType}"/>
`);
    assetCount++;
  }
}

console.log(`\nPages: ${pageCount}, DAM assets: ${assetCount}`);

// --- Build ZIP ---
console.log('Building ZIP...');

const entries = [];
const centralDir = [];
let offset = 0;

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function addFile(relativePath, content) {
  const compressed = zlib.deflateRawSync(content);
  const useCompressed = compressed.length < content.length;
  const data = useCompressed ? compressed : content;
  const crc = crc32(content);
  const nameBuffer = Buffer.from(relativePath, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(useCompressed ? 8 : 0, 8);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  const localEntry = Buffer.concat([header, nameBuffer, data]);
  entries.push(localEntry);
  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(useCompressed ? 8 : 0, 10);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(data.length, 20);
  cdHeader.writeUInt32LE(content.length, 24);
  cdHeader.writeUInt16LE(nameBuffer.length, 28);
  cdHeader.writeUInt32LE(offset, 42);
  centralDir.push(Buffer.concat([cdHeader, nameBuffer]));
  offset += localEntry.length;
}

function walk(dir, prefix) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    const relPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) walk(fullPath, relPath);
    else addFile(relPath, fs.readFileSync(fullPath));
  }
}

walk(buildDir, '');
const cdBuffer = Buffer.concat(centralDir);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(centralDir.length, 8);
eocd.writeUInt16LE(centralDir.length, 10);
eocd.writeUInt32LE(cdBuffer.length, 12);
eocd.writeUInt32LE(offset, 16);
fs.writeFileSync(outputZip, Buffer.concat([...entries, cdBuffer, eocd]));
fs.rmSync(buildDir, { recursive: true });

const stats = fs.statSync(outputZip);
console.log(`\n✅ Package: ${outputZip}`);
console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`   Pages: ${pageCount} (with individual component nodes)`);
console.log(`   DAM Assets: ${assetCount}`);
