#!/usr/bin/env node
/**
 * Fix hardcoded /dashboard Link hrefs in v2 app routes → PanelDashboardLink.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V2_APP = path.join(ROOT, "src/app/(dashboard-v2)");

const DASHBOARD_HREF =
  /href=(?:"(\/dashboard[^"]*)"|'(\/dashboard[^']*)'|(\{`\/dashboard[^`]*`\})|(\{"\/dashboard[^"]*"\}))/;

function walkTsx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsx(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

function injectImport(source) {
  if (source.includes('from "@/components/shared/panel-dashboard-link"')) return source;
  const line = 'import { PanelDashboardLink } from "@/components/shared/panel-dashboard-link";\n';
  const useClient = source.match(/^["']use client["'];\n/m);
  if (useClient) {
    const at = useClient.index + useClient[0].length;
    return source.slice(0, at) + "\n" + line + source.slice(at);
  }
  const firstImport = source.match(/^import .+;\n/m);
  if (firstImport) {
    const at = firstImport.index + firstImport[0].length;
    return source.slice(0, at) + line + source.slice(at);
  }
  return line + source;
}

function readLinkTag(source, linkStart) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  for (let i = linkStart; i < source.length; i++) {
    const ch = source[i];
    const prev = source[i - 1];

    if (!inString && (ch === '"' || ch === "'" || ch === "`")) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && prev !== "\\") {
      inString = false;
    } else if (!inString && ch === "{") {
      depth++;
    } else if (!inString && ch === "}") {
      depth--;
    } else if (!inString && depth === 0 && ch === ">") {
      return source.slice(linkStart, i + 1);
    }
  }
  return null;
}

function patchLinkTags(source) {
  let out = "";
  let i = 0;
  let changed = 0;

  while (i < source.length) {
    const linkStart = source.indexOf("<Link", i);
    if (linkStart === -1) {
      out += source.slice(i);
      break;
    }

    out += source.slice(i, linkStart);
    const tag = readLinkTag(source, linkStart);
    if (!tag) {
      out += source.slice(linkStart);
      break;
    }

    const selfClosing = /\/>\s*$/.test(tag);

    if (DASHBOARD_HREF.test(tag)) {
      const nextTag = tag.replace("<Link", "<PanelDashboardLink");
      out += nextTag;
      changed++;
      if (!selfClosing) {
        const afterTag = linkStart + tag.length;
        const closeStart = source.indexOf("</Link>", afterTag);
        if (closeStart !== -1) {
          out += source.slice(afterTag, closeStart);
          out += "</PanelDashboardLink>";
          i = closeStart + "</Link>".length;
          continue;
        }
      }
      i = linkStart + tag.length;
    } else {
      out += tag;
      i = linkStart + tag.length;
    }
  }

  return { source: out, changed };
}

function removeUnusedLinkImport(source) {
  if (!source.includes('from "next/link"')) return source;
  const stillUsesLink =
    /<Link[\s>]/.test(source) ||
    /<\/Link>/.test(source);
  if (stillUsesLink) return source;
  return source.replace(/^import Link from "next\/link";\n/m, "");
}

let patched = 0;
for (const file of walkTsx(V2_APP)) {
  let source = fs.readFileSync(file, "utf8");
  if (!source.includes("/dashboard")) continue;

  const { source: next, changed } = patchLinkTags(source);
  const needsImport =
    next.includes("<PanelDashboardLink") &&
    !next.includes('from "@/components/shared/panel-dashboard-link"');

  if (changed === 0 && !needsImport) continue;

  let out = changed > 0 ? next : source;
  out = injectImport(out);
  out = removeUnusedLinkImport(out);
  fs.writeFileSync(file, out, "utf8");
  patched++;
  console.log(
    `Patched ${path.relative(ROOT, file)}${changed > 0 ? ` (${changed} links)` : " (import)"}`,
  );
}

console.log(`Done. Patched ${patched} files.`);
