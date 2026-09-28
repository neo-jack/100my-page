import { readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';

const MODULE_ID = 'virtual:notes';
const RESOLVED_ID = '\0' + MODULE_ID;
const MEDIA = /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|ogg|mov)$/i;
const DOWNLOAD = /\.(?:js|md)\.txt$/i;
const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkStringify);
const within = (root, file) => {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

export async function noteFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'AGENTS.md' || /^README(?:\.|$)/i.test(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`笔记目录不能使用符号链接：${entry.name}`);
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await noteFiles(file));
    else if (entry.isFile()) result.push(file);
  }
  return result.sort();
}

export function parseNote(source, file, placement = {}) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  const fail = (message) => { throw new Error(`${file}: ${message}`); };
  if (!match) fail('笔记需要 YAML frontmatter（---）。');
  const data = parse(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('frontmatter 必须是对象。');
  if (Object.keys(data).some((key) => key !== 'title')) fail('frontmatter 只保留 title；场景配置请放入 catalog.json。');
  if (!placement || typeof placement !== 'object' || Array.isArray(placement)) fail('catalog.json 中的场景配置必须是对象。');
  if (typeof data.title !== 'string' || !data.title.trim()) fail('title 必须是非空文本。');
  const string = (key, fallback) => {
    const value = placement[key] ?? fallback;
    if (typeof value !== 'string' || !value.trim()) fail(`${key} 必须是非空文本。`);
    return value;
  };
  const strings = (key) => {
    const value = placement[key] ?? [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) fail(`${key} 必须是文本数组。`);
    return [...new Set(value)];
  };
  const kind = string('kind', 'engineering');
  if (!['engineering', 'portfolio', 'standalone'].includes(kind)) fail('kind 必须是 engineering、portfolio 或 standalone。');
  const id = path.basename(file, '.md') === 'index' ? path.basename(path.dirname(file)) : path.basename(file, '.md');
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(id)) fail('id 必须是英文字母、数字及短横线。');
  const order = placement.order ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(order) || order < 1) fail('order 必须是正整数。');
  const note = {
    id, kind, order, title: data.title, body: match[2].trim(),
  };
  if (!note.body) fail('正文不能为空。');
  if (kind === 'portfolio') {
    note.cover = string('cover');
    note.balloons = strings('balloons');
    const technologyKeys = ['react', 'javascript', 'git', 'figma', 'html', 'css'];
    if (note.balloons.some((key) => !technologyKeys.includes(key))) fail('balloons 包含未配置的气球。');
  }
  return note;
}

// Compile content URLs into Vite imports; source paths and unused attachments never enter the runtime manifest.
export async function compileNotes(root, watch = () => {}) {
  const directory = path.join(root, 'src/data/note');
  const catalogFile = path.join(directory, 'catalog.json');
  watch(catalogFile);
  const catalog = await readFile(catalogFile, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return {};
    throw new Error(`${catalogFile}: ${error.message}`);
  });
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) throw new Error(`${catalogFile}: 场景配置必须是对象。`);
  const allowedRoots = [await realpath(directory), await realpath(path.join(root, 'public'))];
  const files = (await noteFiles(directory)).filter((file) => file.endsWith('.md'));
  const entries = [];
  const imports = new Map();
  const asset = async (url, file, download = false) => {
    const split = url.search(/[?#]/);
    const pathname = split < 0 ? url : url.slice(0, split);
    const suffix = split < 0 ? '' : url.slice(split);
    const absolute = await realpath(path.resolve(path.dirname(file), decodeURIComponent(pathname)));
    if (!allowedRoots.some((base) => within(base, absolute)) || !(MEDIA.test(absolute) || (download && DOWNLOAD.test(absolute)))) {
      throw new Error(`${file}: 媒体必须位于 note/ 或 public/：${url}`);
    }
    watch(absolute);
    if (!imports.has(absolute)) imports.set(absolute, `noteAsset${imports.size}`);
    return `${imports.get(absolute)} + ${JSON.stringify(suffix)}`;
  };
  for (const file of files) {
    watch(file);
    const id = path.basename(file, '.md') === 'index' ? path.basename(path.dirname(file)) : path.basename(file, '.md');
    const note = parseNote(await readFile(file, 'utf8'), file, catalog[id]);
    const nodes = [];
    const visit = (node) => {
      if (['image', 'link', 'definition'].includes(node.type) && node.url && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(node.url)) nodes.push(node);
      node.children?.forEach(visit);
    };
    const tree = markdown.parse(note.body);
    visit(tree);
    const replacements = [];
    for (const node of nodes) {
      const download = node.type !== 'image' && /^download:[A-Za-z0-9_-]+\.(?:js|md)$/.test(node.title ?? '');
      const value = await asset(node.url, file, download);
      let token = `NOTEASSET${replacements.length}PLACEHOLDER`;
      while (note.body.includes(token)) token += 'X';
      node.url = token;
      replacements.push({ token, value });
    }
    const body = markdown.stringify(tree);
    let bodyCode = JSON.stringify(body);
    for (const replacement of replacements) {
      bodyCode += `.replaceAll(${JSON.stringify(replacement.token)}, ${replacement.value})`;
    }
    const { body: _body, cover, ...metadata } = note;
    const coverCode = cover ? `, cover: ${await asset(cover, file)}` : '';
    entries.push({ note, code: `{ ...${JSON.stringify(metadata)}, body: ${bodyCode}${coverCode} }` });
  }
  const ids = new Map();
  for (const { note } of entries) {
    if (ids.has(note.id)) throw new Error(`笔记 ID 重复：${note.id}`);
    ids.set(note.id, note);
  }
  entries.sort((a, b) => a.note.order - b.note.order || a.note.id.localeCompare(b.note.id));
  return [...imports].map(([file, name]) => `import ${name} from ${JSON.stringify(file.replaceAll('\\', '/') + '?url')};`).join('\n')
    + `\nexport default [${entries.map(({ code }) => code).join(',\n')}];`;
}

export default function notes() {
  let root;
  return {
    name: 'markdown-notes',
    configResolved(config) { root = config.root; },
    resolveId(id) { if (id === MODULE_ID) return RESOLVED_ID; },
    async load(id) {
      if (id === RESOLVED_ID) return compileNotes(root, (file) => this.addWatchFile(file));
    },
    configureServer(server) {
      const directory = path.join(root, 'src/data/note');
      server.watcher.add(directory);
      const refresh = (file) => {
        if (!within(directory, path.resolve(file))) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', refresh).off('unlink', refresh).off('change', refresh);
      });
    },
  };
}
