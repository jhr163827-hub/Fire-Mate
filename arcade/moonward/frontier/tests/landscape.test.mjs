import test from "node:test";
import assert from "node:assert/strict";
import { setupLandscape } from "../landscape.mjs";
function env({ fullscreen = true, lock = true, reject = false } = {}) {
  let events = {},
    calls = [],
    messages = [];
  let button = {
    setAttribute(k, v) {
      this[k] = v;
    },
    addEventListener(k, f) {
      this[k] = f;
    },
  };
  let doc = {
    fullscreenElement: null,
    documentElement: {},
    addEventListener(k, f) {
      events[k] = f;
    },
    async exitFullscreen() {
      calls.push("exit");
      this.fullscreenElement = null;
      events.fullscreenchange();
    },
  };
  if (fullscreen)
    doc.documentElement.requestFullscreen = async () => {
      calls.push("fullscreen");
      doc.fullscreenElement = doc.documentElement;
    };
  let orientation = lock
    ? {
        async lock(value) {
          calls.push(value);
          if (reject) throw Error("unsupported");
        },
        unlock() {
          calls.push("unlock");
        },
      }
    : {};
  let control = setupLandscape(
    button,
    (m) => messages.push(m),
    doc,
    orientation,
  );
  return { button, doc, events, calls, messages, control, orientation };
}
test("one tap enters fullscreen then requests landscape; second tap unlocks and exits", async () => {
  const e = env();
  await e.control.toggle();
  assert.deepEqual(e.calls, ["fullscreen", "landscape"]);
  assert.equal(e.button["aria-pressed"], "true");
  await e.control.toggle();
  assert.deepEqual(e.calls, ["fullscreen", "landscape", "unlock", "exit"]);
  assert.equal(e.button.textContent, "가로모드");
});
test("unsupported/rejected APIs give manual rotation guidance without claiming success", async () => {
  for (const opts of [{ fullscreen: false, lock: false }, { reject: true }]) {
    let e = env(opts);
    await e.control.toggle();
    assert.match(e.messages[0], /휴대폰을 가로/);
    assert.equal(e.button.disabled, false);
    e.control.release(true);
  }
});
test("standalone lock works without fullscreen; escape and navigation release ownership", async () => {
  let e = env({ fullscreen: false });
  await e.control.toggle();
  assert.deepEqual(e.calls, ["landscape"]);
  e.control.release();
  assert.equal(e.calls.at(-1), "unlock");
  e = env();
  await e.control.toggle();
  e.doc.fullscreenElement = null;
  e.events.fullscreenchange();
  assert.equal(e.button.textContent, "가로모드");
  assert.equal(e.calls.at(-1), "unlock");
});
test("double tap is serialized and in-flight lock cannot survive leaving", async () => {
  let e = env(),
    resolve;
  e.orientation.lock = () => new Promise((r) => (resolve = r));
  const p = e.control.toggle();
  await Promise.resolve();
  await e.control.toggle();
  assert.equal(e.calls.filter((x) => x === "fullscreen").length, 1);
  e.control.release(true);
  resolve();
  await p;
  assert.equal(e.button["aria-pressed"], "false");
  assert.equal(e.calls.at(-1), "unlock");
});
