const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Actual component execution with hook/JSX stubs, not browser or React DOM proof.
function render() {
  const updates = [];
  const exports = {};
  const frames = [];
  const document = { activeElement: null };
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({ exports, document, requestAnimationFrame: callback => frames.push(callback), module: { exports }, require(name) {
    if (name === 'react') return {
      memo: fn => fn, useMemo: fn => fn(),
      useState: initial => [initial, value => updates.push(value)],
      useRef: initial => ({ current: initial }),
    };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/jargon-glossary') return { JARGON_GLOSSARY: {} };
    if (name === '@/components/ui/tooltip') return { Tooltip: 'root', TooltipTrigger: 'trigger', TooltipContent: 'content' };
    throw new Error(`Unexpected component dependency: ${name}`);
  } });
  const source = readFileSync(`${__dirname}/src/components/sigil/JargonTooltip.tsx`, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } });
  vm.runInContext(outputText, context);
  const root = exports.JargonTooltip({ term: 'approve', definition: 'Synthetic definition.', children: 'approve()' });
  const trigger = root.props.children.find(child => child.type === 'trigger');
  return { root, trigger, updates, frames, document };
}

test('native activation opens jargon content and prevents Radix default click-close', () => {
  const { root, trigger, updates } = render();
  assert.equal(root.props.open, false);
  assert.equal(trigger.props.type, 'button');
  assert.equal(typeof trigger.props.onClick, 'function');
  let prevented = false;
  trigger.props.onClick({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(updates, [true]);
});

test('keyboard focus waits for focus scrolling before opening', () => {
  const { trigger, updates, frames, document } = render();
  const element = { matches: selector => selector === ':focus-visible' };
  document.activeElement = element;
  let prevented = false;
  trigger.props.onFocus({ currentTarget: element, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(updates, []);
  frames.shift()();
  assert.deepEqual(updates, []);
  frames.shift()();
  assert.deepEqual(updates, [true]);
});

test('blur or Escape cancels queued keyboard opening', () => {
  for (const action of ['blur', 'escape']) {
    const { trigger, updates, frames, document } = render();
    const element = { matches: () => true };
    document.activeElement = element;
    trigger.props.onFocus({ currentTarget: element, preventDefault() {} });
    if (action === 'blur') trigger.props.onBlur();
    else trigger.props.onKeyDown({ key: 'Escape' });
    frames.shift()();
    frames.shift()();
    assert.deepEqual(updates, [], action);
  }
});

test('pointer focus does not schedule keyboard opening', () => {
  const { trigger, frames } = render();
  trigger.props.onFocus({ currentTarget: { matches: () => false }, preventDefault() { assert.fail('Pointer focus must retain library handling'); } });
  assert.equal(frames.length, 0);
});

test('explicit activation consumes queued focus work before library dismissal', () => {
  const { root, trigger, updates, frames, document } = render();
  const element = { matches: () => true };
  document.activeElement = element;
  trigger.props.onFocus({ currentTarget: element, preventDefault() {} });
  trigger.props.onClick({ preventDefault() {} });
  root.props.onOpenChange(false);
  frames.shift()();
  frames.shift()();
  assert.deepEqual(updates, [true, false], 'A pending keyboard callback must not reopen explicitly dismissed content');
});

test('library focus and dismissal changes remain connected to controlled state', () => {
  const { root, updates } = render();
  assert.equal(typeof root.props.onOpenChange, 'function');
  root.props.onOpenChange(true);
  root.props.onOpenChange(false);
  assert.deepEqual(updates, [true, false]);
});
