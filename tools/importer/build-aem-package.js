#!/usr/bin/env node

/**
 * Build AEM Package Manager package (.zip) from .plain.html content files.
 *
 * Creates a CRX-compatible content package that can be installed via
 * AEM's Package Manager (http://localhost:4502/crx/packmgr/index.jsp)
 *
 * Usage:
 *   node tools/importer/build-aem-package.js [--site-name <name>] [--content-root <path>]
 *
 * Output:
 *   tools/importer/diversity-rbc-content-package.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const siteName = getArg('site-name', 'eds-pages');
const contentRoot = path.resolve(getArg('content-root', path.join(__dirname, '../../content')));
const outputDir = path.resolve(__dirname);
const packageName = 'diversity-rbc-content-package';
const packageVersion = '1.0.0';
const groupName = 'eds-migration';
const buildDir = path.join(outputDir, '_package-build');

// Ensure clean build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}

// Create package structure
const vaultDir = path.join(buildDir, 'META-INF', 'vault');
const jcrRoot = path.join(buildDir, 'jcr_root', 'content', siteName);
fs.mkdirSync(vaultDir, { recursive: true });
fs.mkdirSync(jcrRoot, { recursive: true });

// --- META-INF/vault/properties.xml ---
const now = new Date().toISOString();
fs.writeFileSync(path.join(vaultDir, 'properties.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <entry key="name">${packageName}</entry>
  <entry key="version">${packageVersion}</entry>
  <entry key="group">${groupName}</entry>
  <entry key="description">Migrated content from diversity.rbc.com for AEM Edge Delivery Services (xwalk)</entry>
  <entry key="createdBy">eds-migration</entry>
  <entry key="created">${now}</entry>
  <entry key="packageType">content</entry>
</properties>
`);

// --- META-INF/vault/filter.xml ---
fs.writeFileSync(path.join(vaultDir, 'filter.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="/content/${siteName}"/>
</workspaceFilter>
`);

// --- META-INF/vault/config.xml ---
fs.writeFileSync(path.join(vaultDir, 'config.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<vaultfs version="1.1">
  <aggregates/>
  <handlers/>
</vaultfs>
`);

// Helper: escape XML content
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: extract metadata from .plain.html
function extractMetadata(html) {
  const meta = {};
  const metaMatch = html.match(/<div class="metadata">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  if (metaMatch) {
    const rows = metaMatch[1].matchAll(/<div><div>(.*?)<\/div><div>([\s\S]*?)<\/div><\/div>/g);
    for (const row of rows) {
      const key = row[1].trim().toLowerCase();
      // Strip HTML tags for text values
      const value = row[2].replace(/<[^>]+>/g, '').trim();
      if (key && value) meta[key] = value;
    }
  }
  return meta;
}

// Helper: extract sections from .plain.html
// Each top-level <div> in the file is a section
function extractSections(html) {
  // Remove the metadata div at the end
  const cleanHtml = html.replace(/<div><div class="metadata">[\s\S]*$/, '').trim();
  // Split by top-level divs
  const sections = [];
  const divRegex = /^<div>([\s\S]*?)<\/div>\s*/gm;
  let match;
  // Simple approach: split on line boundaries since each line is a section div
  const lines = cleanHtml.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('<div>') && trimmed.endsWith('</div>')) {
      sections.push(trimmed.slice(5, -6)); // strip outer <div></div>
    } else if (trimmed) {
      sections.push(trimmed);
    }
  }
  return sections;
}

// --- Create .content.xml for the site root ---
fs.writeFileSync(path.join(jcrRoot, '.content.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="sling:OrderedFolder"
          jcr:title="RBC Diversity"/>
`);

// --- Process each .plain.html file ---
const files = fs.readdirSync(contentRoot)
  .filter(f => f.endsWith('.plain.html'))
  .sort();

console.log(`Building AEM package from ${files.length} content files...`);
console.log(`Site name: ${siteName}`);
console.log(`Content root: /content/${siteName}/`);
console.log('');

let processed = 0;
let skipped = 0;

for (const file of files) {
  const pageName = file.replace('.plain.html', '');
  const html = fs.readFileSync(path.join(contentRoot, file), 'utf8');
  const metadata = extractMetadata(html);

  // Get the page content (everything before metadata block)
  const pageContent = html.replace(/<div><div class="metadata">[\s\S]*$/, '').trim();

  const title = metadata.title || metadata['og:title'] || pageName.replace(/-/g, ' ');
  const description = metadata.description || '';

  // Create page directory
  const pageDir = path.join(jcrRoot, pageName);
  fs.mkdirSync(pageDir, { recursive: true });

  // Create .content.xml for the page (cq:Page)
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

  processed++;
  process.stdout.write(`  [${processed}/${files.length}] ${pageName}\n`);
}

console.log(`\nProcessed: ${processed}, Skipped: ${skipped}`);

// --- Build the zip ---
const outputZip = path.join(outputDir, `${packageName}.zip`);
console.log(`\nCreating package: ${outputZip}`);

try {
  // Try using jar command (available in Java environments)
  execSync(`cd "${buildDir}" && jar -cfM "${outputZip}" .`, { stdio: 'pipe' });
  console.log('Created using jar command');
} catch {
  try {
    // Fallback to tar with gzip renamed
    // Actually, let's use node to create a proper zip
    // Use a simple approach with the 'archiver' pattern via child process
    execSync(`cd "${buildDir}" && find . -type f | sort | xargs tar cf - | gzip > "${outputZip}.tar.gz"`, { stdio: 'pipe' });

    // Try zip command
    execSync(`which zip`, { stdio: 'pipe' });
    execSync(`cd "${buildDir}" && zip -r "${outputZip}" . -x '.*'`, { stdio: 'pipe' });
    console.log('Created using zip command');
  } catch {
    // Last resort: use Node.js built-in zlib with manual zip creation
    console.log('zip/jar not available, creating with Node.js...');
    createZipWithNode(buildDir, outputZip);
  }
}

// Cleanup build dir
fs.rmSync(buildDir, { recursive: true });

const stats = fs.statSync(outputZip);
console.log(`\n✅ Package created: ${outputZip}`);
console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`   Pages: ${processed}`);
console.log(`\nTo install:`);
console.log(`  1. Open AEM Package Manager: https://${getArg('host', 'author-p153224-e1601239.adobeaemcloud.com')}/crx/packmgr/index.jsp`);
console.log(`  2. Click "Upload Package" and select the .zip file`);
console.log(`  3. Click "Install" on the uploaded package`);

/**
 * Create a ZIP file using Node.js built-in modules (no external deps).
 * Implements the ZIP file format spec (PKZIP) directly.
 */
function createZipWithNode(sourceDir, destZip) {
  const zlib = require('zlib');

  const entries = [];
  const centralDir = [];
  let offset = 0;

  function addFile(relativePath, content) {
    const compressed = zlib.deflateRawSync(content);
    const useCompressed = compressed.length < content.length;
    const data = useCompressed ? compressed : content;

    // CRC32
    const crc = crc32(content);

    // Local file header
    const nameBuffer = Buffer.from(relativePath, 'utf8');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(useCompressed ? 8 : 0, 8); // compression method
    header.writeUInt16LE(0, 10); // mod time
    header.writeUInt16LE(0, 12); // mod date
    header.writeUInt32LE(crc, 14); // crc32
    header.writeUInt32LE(data.length, 18); // compressed size
    header.writeUInt32LE(content.length, 22); // uncompressed size
    header.writeUInt16LE(nameBuffer.length, 26); // filename length
    header.writeUInt16LE(0, 28); // extra field length

    const localEntry = Buffer.concat([header, nameBuffer, data]);
    entries.push(localEntry);

    // Central directory entry
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // signature
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed
    cdHeader.writeUInt16LE(0, 8); // flags
    cdHeader.writeUInt16LE(useCompressed ? 8 : 0, 10); // compression
    cdHeader.writeUInt16LE(0, 12); // mod time
    cdHeader.writeUInt16LE(0, 14); // mod date
    cdHeader.writeUInt32LE(crc, 16); // crc32
    cdHeader.writeUInt32LE(data.length, 20); // compressed size
    cdHeader.writeUInt32LE(content.length, 24); // uncompressed size
    cdHeader.writeUInt16LE(nameBuffer.length, 28); // filename length
    cdHeader.writeUInt16LE(0, 30); // extra field length
    cdHeader.writeUInt16LE(0, 32); // comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal attrs
    cdHeader.writeUInt32LE(0, 38); // external attrs
    cdHeader.writeUInt32LE(offset, 42); // relative offset

    centralDir.push(Buffer.concat([cdHeader, nameBuffer]));
    offset += localEntry.length;
  }

  // CRC32 implementation
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Recursively add files
  function walk(dir, prefix) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        addFile(relPath, fs.readFileSync(fullPath));
      }
    }
  }

  walk(sourceDir, '');

  // Build central directory
  const cdBuffer = Buffer.concat(centralDir);
  const cdSize = cdBuffer.length;
  const cdOffset = offset;

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // cd disk number
  eocd.writeUInt16LE(centralDir.length, 8); // entries on this disk
  eocd.writeUInt16LE(centralDir.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment length

  const zipBuffer = Buffer.concat([...entries, cdBuffer, eocd]);
  fs.writeFileSync(destZip, zipBuffer);
}
