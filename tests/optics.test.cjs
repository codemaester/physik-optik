const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const source = html.slice(html.indexOf('  function simMirror(){'), html.indexOf('  function simRefraction(){'));

// Run the actual render functions with a minimal DOM, without browser dependencies.
function simulation(name) {
  const elements = new Map();
  const box = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {});
      return elements.get(selector);
    },
  };
  let render;
  runInNewContext(source + `\n${name}();`, {
    shell: () => box,
    controlRange: () => '',
    setup: (chapter, target, defaults, callback) => {
      for (const [id, value] of Object.entries(defaults)) {
        Object.assign(box.querySelector('#' + id), typeof value === 'boolean' ? { checked: value } : { value });
      }
      render = callback;
    },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    fmt: (value, digits) => value.toFixed(digits).replace('.', ','),
    line: (cls, a, b) => `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"></line>`,
    txt: (x, y, text) => `<text x="${x}" y="${y}">${text}</text>`,
    metric: (label, value) => `${label}: ${value}`,
  });
  return (values = {}) => {
    for (const [id, value] of Object.entries(values)) {
      Object.assign(box.querySelector('#' + id), typeof value === 'boolean' ? { checked: value } : { value });
    }
    render(box);
    return box.querySelector('svg').innerHTML;
  };
}

function attributes(markup, tag, match) {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))]
    .map(([element]) => Object.fromEntries([...element.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])))
    .find(match);
}

function geometry(markup) {
  const head = attributes(markup, 'circle', attrs => attrs.fill === 'none');
  const foot = attributes(markup, 'line', attrs => attrs['stroke-width'] === '7');
  const mirror = attributes(markup, 'line', attrs => attrs.class === 'live-mirror');
  return {
    height: +foot.y2 - (+head.cy - +head.r),
    mirrorHeight: +mirror.y2 - +mirror.y1,
    distance: +mirror.x1 - +head.cx,
    mirrorTop: +mirror.y1,
    mirrorBottom: +mirror.y2,
  };
}

test('the requested overview badges are removed', () => {
  for (const text of ['7 Kapitel', '105 Multiple-Choice-Fragen', '14 schriftliche Aufgaben', 'Offline lernbar*']) {
    assert.ok(!html.includes(text), text);
  }
});

test('the eye remains visible when auxiliary rays are toggled off and on', () => {
  const render = simulation('simMirror');
  for (const show of [true, false, true]) {
    const markup = render({ s4rays: show });
    assert.ok(attributes(markup, 'circle', attrs => attrs.fill === '#f0a11a'));
    assert.ok(markup.includes('>Auge</text>'));
    assert.equal(markup.includes('class="live-ray-ref"'), show);
    assert.equal(markup.includes('class="live-ray-in"'), show);
  }
});

test('person and mirror grow proportionally across the complete height range', () => {
  const render = simulation('simMirrorHeight');
  const initial = geometry(render({ s5height: 140 }));
  for (let height = 140; height <= 205; height++) {
    const result = geometry(render({ s5height: height }));
    assert.ok(Math.abs(result.height / initial.height - height / 140) < 1e-10);
    assert.ok(Math.abs(result.mirrorHeight / result.height - 0.5) < 1e-10);
    assert.equal(result.distance, initial.distance);
  }
});

test('distance uses the same scale and leaves mirror height and position unchanged', () => {
  const render = simulation('simMirrorHeight');
  for (const height of [140, 175, 205]) {
    const initial = geometry(render({ s5height: height, s5dist: 0.5 }));
    for (const distance of [0.5, 1.5, 4]) {
      const result = geometry(render({ s5dist: distance }));
      assert.equal(result.height, initial.height);
      assert.equal(result.mirrorTop, initial.mirrorTop);
      assert.equal(result.mirrorBottom, initial.mirrorBottom);
      assert.ok(Math.abs(result.distance / result.height - distance * 100 / height) < 1e-10);
    }
  }
});
