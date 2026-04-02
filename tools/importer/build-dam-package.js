#!/usr/bin/env node

/**
 * Build AEM Package with DAM assets + content pages (HTML references updated).
 *
 * 1. Creates DAM asset nodes under /content/dam/eds-pages/diversity/
 * 2. Updates content HTML to replace diversity.rbc.com URLs with DAM paths
 * 3. Rebuilds content package with updated references
 * 4. Outputs a single installable .zip
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const siteName = 'eds-pages';
const damRoot = `eds-pages/diversity`;
const contentDir = path.resolve(__dirname, '../../content');
const imagesDir = path.resolve(__dirname, '../../migration-work/dam-images');
const imageUrlFile = path.resolve(__dirname, '../../migration-work/image-urls.txt');
const outputZip = path.resolve(__dirname, 'diversity-rbc-full-package.zip');
const buildDir = path.resolve(__dirname, '_full-package-build');
const now = new Date().toISOString();

// Clean
if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });

// Dirs
const vaultDir = path.join(buildDir, 'META-INF', 'vault');
const jcrContent = path.join(buildDir, 'jcr_root', 'content', siteName);
const jcrDam = path.join(buildDir, 'jcr_root', 'content', 'dam', damRoot);
fs.mkdirSync(vaultDir, { recursive: true });
fs.mkdirSync(jcrContent, { recursive: true });
fs.mkdirSync(jcrDam, { recursive: true });

// --- Vault metadata ---
fs.writeFileSync(path.join(vaultDir, 'properties.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <entry key="name">diversity-rbc-full-package</entry>
  <entry key="version">1.0.0</entry>
  <entry key="group">eds-migration</entry>
  <entry key="description">Migrated content and DAM assets from diversity.rbc.com</entry>
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

// --- Build URL → DAM path mapping ---
const imageUrls = fs.readFileSync(imageUrlFile, 'utf8').trim().split('\n');
const urlToDam = {};

for (const url of imageUrls) {
  const filename = path.basename(url).replace(/[?#].*/, '');
  const damPath = `/content/dam/${damRoot}/${filename}`;
  urlToDam[url] = damPath;
}

console.log(`Image URL mapping: ${Object.keys(urlToDam).length} entries`);

// --- Create DAM asset nodes ---
const imageFiles = fs.readdirSync(imagesDir);
let assetCount = 0;

for (const filename of imageFiles) {
  const filePath = path.join(imagesDir, filename);
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) continue;

  // Determine mime type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  // Create asset directory structure
  // /content/dam/eds-pages/diversity/<filename>/
  //   .content.xml (dam:Asset)
  //   jcr:content/
  //     .content.xml (dam:AssetContent)
  //     renditions/
  //       original (the actual file)
  //       original.dir/
  //         .content.xml (nt:resource with mime type)

  const assetDir = path.join(jcrDam, filename);
  const jcrContentDir = path.join(assetDir, 'jcr:content');
  const renditionsDir = path.join(jcrContentDir, 'renditions');
  fs.mkdirSync(renditionsDir, { recursive: true });

  // Asset node
  fs.writeFileSync(path.join(assetDir, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:dam="http://www.day.com/dam/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          jcr:primaryType="dam:Asset">
  <jcr:content
      jcr:primaryType="dam:AssetContent">
    <metadata
        jcr:primaryType="nt:unstructured"
        dam:size="${stat.size}"
        dc:format="${mimeType}"/>
  </jcr:content>
</jcr:root>
`);

  // Copy the original rendition
  fs.copyFileSync(filePath, path.join(renditionsDir, 'original'));

  // Original rendition metadata
  const originalDir = path.join(renditionsDir, 'original.dir');
  fs.mkdirSync(originalDir, { recursive: true });
  fs.writeFileSync(path.join(originalDir, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          jcr:primaryType="nt:resource"
          jcr:mimeType="${mimeType}"/>
`);

  assetCount++;
}

console.log(`DAM assets created: ${assetCount}`);

// --- XML helpers ---
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// --- Create content pages with updated image references ---
// Site root
fs.writeFileSync(path.join(jcrContent, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="sling:OrderedFolder"
          jcr:title="RBC Diversity"/>
`);

const contentFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.plain.html')).sort();
let pageCount = 0;

for (const file of contentFiles) {
  const pageName = file.replace('.plain.html', '');
  let html = fs.readFileSync(path.join(contentDir, file), 'utf8');

  // Replace image URLs with DAM paths
  for (const [url, damPath] of Object.entries(urlToDam)) {
    // Escape special regex characters in URL
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(escaped, 'g'), damPath);
  }

  // Extract metadata
  const meta = {};
  const metaMatch = html.match(/<div class="metadata">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  if (metaMatch) {
    const rows = metaMatch[1].matchAll(/<div><div>(.*?)<\/div><div>([\s\S]*?)<\/div><\/div>/g);
    for (const row of rows) {
      const key = row[1].trim().toLowerCase();
      const value = row[2].replace(/<[^>]+>/g, '').trim();
      if (key && value) meta[key] = value;
    }
  }

  const title = meta.title || meta['og:title'] || pageName.replace(/-/g, ' ');
  const description = meta.description || '';
  const pageContent = html.replace(/<div><div class="metadata">[\s\S]*$/, '').trim();

  const pageDir = path.join(jcrContent, pageName);
  fs.mkdirSync(pageDir, { recursive: true });

  fs.writeFileSync(path.join(pageDir, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
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
      cq:lastModified="${now}"
      cq:template="/conf/${siteName}/settings/wcm/templates/page">
    <root
        jcr:primaryType="nt:unstructured"
        sling:resourceType="core/franklin/components/root/v1/root">
      <section
          jcr:primaryType="nt:unstructured"
          sling:resourceType="core/franklin/components/section/v1/section">
        <richtext
            jcr:primaryType="nt:unstructured"
            sling:resourceType="core/franklin/components/text/v1/text"
            text="${escapeXml(pageContent)}"/>
      </section>
    </root>
  </jcr:content>
</jcr:root>
`);

  pageCount++;
  if (pageCount % 10 === 0) process.stdout.write(`  Pages: ${pageCount}/${contentFiles.length}\n`);
}

console.log(`Content pages created: ${pageCount}`);

// --- Build ZIP ---
console.log('\nBuilding ZIP package...');

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
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);

  const localEntry = Buffer.concat([header, nameBuffer, data]);
  entries.push(localEntry);

  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0, 8);
  cdHeader.writeUInt16LE(useCompressed ? 8 : 0, 10);
  cdHeader.writeUInt16LE(0, 12);
  cdHeader.writeUInt16LE(0, 14);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(data.length, 20);
  cdHeader.writeUInt32LE(content.length, 24);
  cdHeader.writeUInt16LE(nameBuffer.length, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
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
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(centralDir.length, 8);
eocd.writeUInt16LE(centralDir.length, 10);
eocd.writeUInt32LE(cdBuffer.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

fs.writeFileSync(outputZip, Buffer.concat([...entries, cdBuffer, eocd]));

// Cleanup
fs.rmSync(buildDir, { recursive: true });

const stats = fs.statSync(outputZip);
console.log(`\n✅ Full package created: ${outputZip}`);
console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`   Pages: ${pageCount}`);
console.log(`   DAM Assets: ${assetCount}`);
console.log(`\nPackage contains:`);
console.log(`  /content/${siteName}/ — ${pageCount} pages (HTML references updated to DAM paths)`);
console.log(`  /content/dam/${damRoot}/ — ${assetCount} images`);
console.log(`\nTo install:`);
console.log(`  1. Open AEM Package Manager`);
console.log(`  2. Upload diversity-rbc-full-package.zip`);
console.log(`  3. Click Install`);
