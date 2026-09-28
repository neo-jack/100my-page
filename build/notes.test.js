import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { build } from 'vite';
import notes, { compileNotes, parseNote } from './notes.js';

const header = '---\ntitle: 示例笔记\n---\n\n';

async function fixture(t) {
  const cache = path.resolve('node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'notes-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), cache);
    assert.ok(path.basename(root).startsWith('notes-test-'));
    await rm(root, { recursive: true, force: true });
  });
  const directory = path.join(root, 'src/data/note/example');
  await mkdir(directory, { recursive: true });
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(directory, 'diagram (示意).svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="red"/></svg>');
  await writeFile(path.join(directory, 'demo.webm'), 'fixture-video-bytes');
  return { root, directory, file: path.join(directory, 'index.md') };
}

test('production notes preserve Markdown, rewrite referenced media, and omit unused content files', async (t) => {
  const { root, directory, file } = await fixture(t);
  await writeFile(file, header + '**正文**\n\n![示意](<./diagram (示意).svg>)\n\n![演示][clip]\n\n[clip]: ./demo.webm#t=1\n\n[图片](./diagram%20(%E7%A4%BA%E6%84%8F).svg)\n\n```md\n![代码示例](./missing.png)\n```\n\n| 一 | 二 |\n| - | - |\n| A | B |');
  await writeFile(path.join(directory, 'unused.svg'), '<svg>unused</svg>');
  await writeFile(path.join(directory, 'AGENTS.md'), 'PRIVATE MAINTENANCE');
  await writeFile(path.join(directory, 'README.md'), 'NOT CONTENT');
  await writeFile(path.join(root, 'entry.js'), 'import notes from "virtual:notes"; globalThis.notes = notes;');
  await build({ root, configFile: false, publicDir: false, base: '/showcase/', logLevel: 'silent', plugins: [notes()],
    build: { outDir: 'out', minify: false, assetsInlineLimit: 0, rollupOptions: { input: path.join(root, 'entry.js'), output: { entryFileNames: 'entry.js', assetFileNames: 'assets/[hash][extname]' } } } });
  const source = await readFile(path.join(root, 'out/entry.js'), 'utf8');
  const context = {};
  vm.runInNewContext(source, context);
  assert.equal(context.notes.length, 1);
  assert.equal(context.notes[0].id, 'example');
  assert.match(context.notes[0].body, /!\[示意\]\(\/showcase\/assets\/[\w-]+\.svg\)/);
  assert.match(context.notes[0].body, /\[clip\]: \/showcase\/assets\/[\w-]+\.webm#t=1/);
  assert.match(context.notes[0].body, /!\[代码示例\]\(\.\/missing\.png\)/);
  assert.match(context.notes[0].body, /\| 一\s*\| 二/);
  assert.doesNotMatch(source, /PRIVATE MAINTENANCE|NOT CONTENT|diagram%20|src\/data\/note|unused\.svg/);
  const assets = await readdir(path.join(root, 'out/assets'));
  assert.equal(assets.length, 2);
  assert.equal(await readFile(path.join(root, 'out/assets', assets.find((name) => name.endsWith('.webm'))), 'utf8'), 'fixture-video-bytes');
});

test('metadata errors and duplicate IDs stop the build; zero notes and file additions are supported', async (t) => {
  const { root, file, directory } = await fixture(t);
  assert.match(await compileNotes(root), /export default \[\]/);
  assert.throws(() => parseNote('正文', file), /frontmatter/);
  assert.throws(() => parseNote(header + '正文', file, { order: -1 }), /order/);
  assert.throws(() => parseNote(header + '正文', file, { kind: 'unknown' }), /kind/);
  assert.throws(() => parseNote(header.replace('title: 示例笔记', 'title: 示例笔记\ncategory: 工程优化') + '正文', file), /只保留 title/);
  assert.throws(() => parseNote(header.replace('title: 示例笔记', 'title: ""') + '正文', file), /title/);
  assert.throws(() => parseNote(header, file), /正文不能为空/);
  assert.equal(parseNote(header + '正文', file).kind, 'engineering');
  await writeFile(file, header + '正文');
  assert.match(await compileNotes(root), /示例笔记/);
  await writeFile(path.join(directory, 'example.md'), header + '另一篇');
  await assert.rejects(compileNotes(root), /ID 重复/);
});

test('missing media and imports outside the content roots fail with actionable errors', async (t) => {
  const { root, file } = await fixture(t);
  await writeFile(file, header + '![丢失图片](./missing.png)');
  await assert.rejects(compileNotes(root), /missing\.png/);
  await writeFile(path.join(root, 'outside.svg'), '<svg/>');
  await writeFile(file, header + '![越界图片](../../../../outside.svg)');
  await assert.rejects(compileNotes(root), /媒体必须位于/);
});

test('standalone content compiles without a cover and stays outside scene lists', async (t) => {
  const { root, file } = await fixture(t);
  await writeFile(file, header + '独立纸条正文');
  await writeFile(path.join(root, 'src/data/note/catalog.json'), JSON.stringify({ example: { kind: 'standalone' } }));
  const source = await compileNotes(root);
  const { default: entries } = await import('data:text/javascript,' + encodeURIComponent(source));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, 'standalone');
  assert.match(entries[0].body, /独立纸条正文/);
  assert.equal(entries[0].cover, undefined);
  assert.equal(entries.filter((note) => note.kind === 'engineering').length, 0);
  assert.equal(entries.filter((note) => note.kind === 'portfolio').length, 0);
});

test('title-only portfolio notes use catalog covers, ordering, and balloons', async (t) => {
  const { root, file, directory } = await fixture(t);
  const placement = { kind: 'portfolio', order: 2, cover: './diagram (示意).svg', balloons: ['react'] };
  const project = parseNote(header + '正文', file, placement);
  assert.equal(project.title, '示例笔记');
  assert.equal(project.kind, 'portfolio');
  assert.equal(project.order, 2);
  assert.equal(project.cover, placement.cover);
  assert.deepEqual(project.balloons, ['react']);
  assert.throws(() => parseNote(header + '正文', file, { ...placement, cover: undefined }), /cover/);
  assert.throws(() => parseNote(header + '正文', file, { ...placement, balloons: ['unknown'] }), /气球/);
  await writeFile(file, header + '正文');
  await writeFile(path.join(directory, 'unlisted.md'), header + '自动收录');
  const catalogFile = path.join(root, 'src/data/note/catalog.json');
  await writeFile(catalogFile, JSON.stringify({ example: placement }));
  const watched = [];
  const source = await compileNotes(root, (file) => watched.push(file));
  assert.match(source, /"kind":"portfolio"/);
  assert.match(source, /cover: noteAsset0/);
  assert.ok(source.indexOf('"id":"example"') < source.indexOf('"id":"unlisted"'));
  assert.ok(watched.includes(catalogFile));
  assert.doesNotMatch(source, /pendingLabel|category|summary|stack|coverTitle/);
  await writeFile(catalogFile, '[]');
  await assert.rejects(compileNotes(root), /场景配置必须是对象/);
});


test('numbered note IDs preserve uppercase categories and reject invalid characters', () => {
  for (const id of ['A1react', 'A2design', 'B1mechanism', 'C1chat']) {
    assert.equal(parseNote(header + '正文', path.join('note', id, 'index.md')).id, id);
  }
  for (const id of ['A1 react', 'A1_react', '-A1react']) {
    assert.throws(() => parseNote(header + '正文', path.join('note', id, 'index.md')), /id 必须/);
  }
});

test('explicit downloads preserve bytes and filenames without collecting skill Markdown as a note', async (t) => {
  const { root, directory, file } = await fixture(t);
  const skill = '---\nname: example-skill\n---\nXXXXXXX';
  const script = 'console.log("download only");';
  await writeFile(path.join(directory, 'SKILL.md.txt'), skill);
  await writeFile(path.join(directory, 'heatmap.js.txt'), script);
  await writeFile(file, header + '[工作流](./SKILL.md.txt "download:SKILL.md")\n[脚本](./heatmap.js.txt "download:heatmap.js")');
  await writeFile(path.join(root, 'entry.js'), 'import notes from "virtual:notes"; globalThis.notes = notes;');
  await build({ root, configFile: false, publicDir: false, logLevel: 'silent', plugins: [notes()],
    build: { outDir: 'out', minify: false, assetsInlineLimit: 0, rollupOptions: { input: path.join(root, 'entry.js'), output: { entryFileNames: 'entry.js', assetFileNames: 'assets/[hash][extname]' } } } });
  const context = {};
  vm.runInNewContext(await readFile(path.join(root, 'out/entry.js'), 'utf8'), context);
  assert.equal(context.notes.length, 1);
  assert.match(context.notes[0].body, /\/assets\/[\w-]+\.txt "download:SKILL.md"/);
  const assets = await readdir(path.join(root, 'out/assets'));
  assert.equal(assets.length, 2);
  assert.deepEqual(new Set(await Promise.all(assets.map(name => readFile(path.join(root, 'out/assets', name), 'utf8')))), new Set([skill, script]));
  await writeFile(file, header + '[未标记](./SKILL.md.txt)');
  await assert.rejects(compileNotes(root), /媒体必须位于/);
  await writeFile(file, header + '![非图片](./SKILL.md.txt "download:SKILL.md")');
  await assert.rejects(compileNotes(root), /媒体必须位于/);
});
