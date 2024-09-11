# Eventer

[![npm Module](https://badge.fury.io/js/@byojs%2Feventer.svg)](https://www.npmjs.org/package/@byojs/eventer)
[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

**Eventer** is a zero-dependency event emitter, with optional support for async `emit()`, and [weak event listeners](WEAK.md).

```js
const onUpdate = data => {
    console.log(`Data updated: ${data}`);
};

events.on("update",onUpdate);

events.emit("update",{ hello: "world" })
// Data updated: { hello: "world" }
```

----

[Library Tests (Demo)](https://byojs.dev/eventer/)

----

## Overview

The main purpose of **Eventer** is to provide a basic event emitter that supports two specific helpful features that most event emitters do not have:

1. async `emit()`: asynchronous event handling sometimes makes it easier to work around difficult issues with event handling.

    For example, if the listener for one event subscribes or unsubscribes other event handlers, you can run into events that fire when they shouldn't (or vice versa). Or you may encounter infinite event loops (events calling each other mutually, for ever).

    On the other hand, asynchrony is always more intricate to manage propperly. Developers should use caution when deciding how to handle events.

    **Eventer** supports both *sync* and *async* modes for event emission; this mode is configured at emitter instance creation instead of at every `emit()` call.

2. [weak event listeners](WEAK.md): this is a pattern for managing the subscription of events, which holds a reference to the listener (function) *weakly*; the emitter instance **DOES NOT** prevent the listener function -- and particularly, anything the function has a closure over! -- from being cleaned up by GC (garbage collection).

    Typically, developers have to remember to remove an event subscription if the listener (or any object it belongs to) is intentionally being unset for GC purposes; otherwise, an event emitter's default *strong reference* keeps that listener value (and its closure!) alive, preventing GC.

    **Eventer** supports both *strong* and *weak* modes for listener subscription; this mode is configured at emitter instance creation instead of every `on()` / `once()` call.

## Deployment / Import

```cmd
npm install @byojs/eventer
```

The [**@byojs/eventer** npm package](https://npmjs.com/package/@byojs/eventer) includes a `dist/` directory with all files you need to deploy **Eventer** (and its dependencies) into your application/project.

**Note:** If you obtain this library via git instead of npm, you'll need to [build `dist/` manually](#re-building-dist) before deployment.

### Using a bundler

If you are using a bundler (Astro, Vite, Webpack, etc) for your web application, you should not need to manually copy any files from `dist/`.

Just `import` like so:

```js
import Eventer from "@byojs/eventer";
```

The bundler tool should pick up and find whatever files (and dependencies) are needed.

### Without using a bundler

If you are not using a bundler (Astro, Vite, Webpack, etc) for your web application, and just deploying the contents of `dist/` as-is without changes (e.g., to `/path/to/js-assets/eventer/`), you'll need an [Import Map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) in your app's HTML:

```html
<script type="importmap">
{
    "imports": {
        "eventer": "/path/to/js-assets/eventer.mjs"
    }
}
</script>
```

Now, you'll be able to `import` the library in your app in a friendly/readable way:

```js
import Eventer from "eventer";
```

**Note:** If you omit the above *eventer* import-map entry, you can still `import` **Eventer** by specifying the proper full path to the `eventer.mjs` file.

## Eventer API

The API provided by **Eventer** is a single constructor function, to create emitter instances:

```js
import Eventer from "..";

var events = new Eventer({ /* options */ });
```

The options that can be passed to the constructor:

* `asyncEmit` (default: `false`): controls whether `emit()` calls will immediately trigger event listeners, or wait for the next asynchronous microtask to trigger them.

* `weakListeners` (default: `true`): controls whether any listeners (function callbacks) are held *strongly* (as typical) or [*weakly* (for more advanced memory management)](WEAK.md).

### Class-based composition

The exposed API function (`Eventer()` above) can act as a constructable `class` (as seen with the `new` call), which means it can be used in an `extends` clause of a child/derived class:

```js
class myGreatStuff extends Eventer {
    constructor(eventerOptions,otherOptions) {
        super(eventerOptions);
        // ..
    }

    // ..
}

var thing = new myGreatStuff(..);

thing instanceof MyGreatStuff;  // true
thing instanceof Eventer;       // true

thing.emit("whatever");
```

*Composition through inheritance* essentially *mixes in* event emitter capabilities to your own data structure definition. Many prefer this approach.

Others prefer a more explicit form of *composition* (over/instead of inheritance) to maintain an **Eventer** instance as a clean, separate object. For example:

```js
class myGreatStuff {
    eventer = new Eventer(..)

    // ..
}

var thing = new myGreatStuff(..);

thing.eventer.emit("whatever");
```

### Without classes

If you're not using `Eventer()` as an inheritable parent class, you don't really have to use `class` design at all.

In fact, `Eventer()` can be called as a *factory function* without `new`, if you prefer:

```js
var events = Eventer({ /* options */ });
```

### Be aware of `this`!

Even if `Eventer()` is called without `new`, a class instance is still created underneath. That means that the methods on the returned object instance (e.g., `events.emit(..)`) are `this`-aware of their host context (instance).

The following approaches *will break*:

```js
var myEmit = events.emit;

myEmit("whatever");         // broken!
```

```js
someAsyncTask().then(events.emit);  // broken!
```

```js
events.emit.call(myOtherObject,"whatever");  // broken!
```

Instead, you'll need to ensure methods are always called against their original instance as `this` context.

```js
events.emit("whatever");  // safe, preferred
```

```js
var myEmit = events.emit;

myEmit.call(events,"whatever");  // safe
```

```js
someAsyncTask().then(
    evtName => events.emit(evtName)  // safe, preferred
);

someAsyncTask().then(
    events.emit.bind(events)  // safe
);
```

## Instance API

Each instance of **Eventer** provides the following methods.

### `on(..)` Method

The `on(..)` method subscribes a listener (function) to an event (by string name, or `Symbol` value):

```js
function onWhatever() {
    console.log("'whatever' event fired!");
}

// subscribe to "whatever" event
events.on("whatever",onWhatever);
```

```js
function onSpecialEvent() {
    console.log("special event fired!");
}

// subscribe to `specialEvent` event
var specialEvent = Symbol("special event");
events.on(specialEvent,onSpecialEvent);
```

Event listener functions are invoked with `this`-context of the emitter instance, *if possible*; `=>` arrow functions never have `this` binding, and already `this`-hard-bound (via `.bind(..)`) functions cannot be `this`-overridden.

Event subscriptions must be unique, meaning the event+listener combination must not have already been subscribed. This makes **Eventer** safer, preventing duplicate event subscriptions -- a common bug in event-oriented program design.

The `on(..)` method returns `true` if successfully subscribed, or `false` (if subscription was skipped).

### Event arguments

An event listener function may optionally declare one or more parameters, which are passed in as arguments when the event is [`emit(..)`ed](#emit-method).

For example:

```js
function onPositionUpdate(x,y) {
    console.log(`Map position: (${x},${y})`);
}

myMap.on("position-update",onPositionUpdate);
```

### Inline event listeners (functions)

It's very common in modern JS programming, and especially with event handling code, to pass inline functions (e.g., `=>` arrow functions) as event listeners. However, there are some very important details/gotchas to be aware of when doing so with **Eventer**.

#### NOT inline event listeners

But before we explain those gotchas, let's highlight the preferred alternative to inline functions (as already implied in previous snippets!):

```js
function onWhatever() {
    // this is a safe and stable event listener
    console.log("'whatever' event fired!");
}

events.on("whatever",onWhatever);
```

```js
var myApp = {
    // ..
    onWhatever() {
        // this is a safe and stable event listener,
        // as long as it's not `this`-dependent
        console.log("'whatever' event fired!");
    }
    // ..
};

events.on("whatever",myApp.onWhatever);
```

```js
class App {
    // ..
    onWhatever = () => {
        // this is a safe and stable event listener,
        // even if it uses `this` (since it's a
        // lexical-`this` arrow function)
        console.log("'whatever' event fired!");
    }
    // ..
}

var myApp = new App();

events.on("whatever",myApp.onWhatever);
```

All of these approaches are *safe* and avoid the issues we will now cover with using inline function listeners.

#### Inline handler gotchas

First of all, the subscription (`on(..)` / `once(..)`) mechanism uses function reference identity to determine uniqueness of event+listener subscription. If you pass an inline function expression (or a dynamically `this`-bound function instance), each subscription will use a new function; the duplicate-subscription prevention will be defeated, potentially leading to bugs.

For example:

```js
function listenToWhatever() {
    events.on(
        "whatever",
        () => console.log("'whatever' event fired!")
    );
}

listenToWhatever();

// later, elsewhere:
listenToWhatever();
```

Here, each `=>` arrow function is unique (per `listenToWhatever()` call), so there are now two distinct event subscriptions. When the `"whatever"` event is fired, *both* listeners will fire. This may be desired, but it's often a confusing gotcha bug.

It's generally a good idea to pass non-inline functions (with stable definitions), as listeners; this enables **Eventer**'s helpful duplicate event handler prevention.

#### Unsubscribe what?

Another concern with passing inline functions as listeners: the most common/preferred [`off(..)` unsubscription approach](#off-method) requires the same function reference for unsubscription as was originally subscribed. You almost certainly will not hold another reference to an inline function -- by definition, it was defined only *inline* at the subscription site -- to use in its later unsubscription.

```js
events.on(
    "whatever",
    () => console.log("'whatever' event fired!")
);

// later:
events.off("whatever", /* OOPS, what do I pass here!? */)
```

**Note:** This unsubscription concern is not *fatal*, though. There are [other ways to use `off(..)` unsubscription](#alternate-unsubscription) that avoid this issue.

#### Accidental unsubscription

The most pressing concern with inline event listeners arises when using the [*weak event listeners* mode](WEAK.md). Since this is the *default* mode of **Eventer**, it's of particular importance to be aware of this *very likely* gotcha.

Since there is *by definition* no other reference to an inline function reference other than the one passed into `on(..)` / `once(..)`, once the lexical scope (i.e., surrounding function, etc) of the subscription has finished, and its contents are now subject to GC cleanup, the **listener function itself** will likely be GC removed.

By design, **Eventer**'s [*weak event listeners* mode](WEAK.md) ensures event subscriptions are discarded if the listener itself is GC'd. This helps prevent accidental memory leaks when forgetting to unsubscribe events that are no longer relevant.

However, GC is *inherently and intentionally* somewhat unpredictable. It's not guaranteed, or even likely, that GC will happen immediately on a lexical scope being completed; it *may* happen sometime in the near future -- and, only if there are no intentional or accidental closures keeping all or part of the lexical scope alive!

That means your event subscriptions with inline functions **are subject to fairly unpredictable behavior**. They may fire for awhile and then silently stop, even with no further affirmative action from your controlling app code.

For illustration:

```js
function listenToWhatever() {
    events.on(
        "whatever",
        () => console.log("'whatever' event fired!")
    );
}

listenToWhatever();
```

After the call to `listenToWhatever()`, any `"whatever"` events fire may be handled or not, unpredictably, because the inner `=>` arrow function is now subject to GC cleanup at any point the JS engine feels like it!

### `once(..)` Method

The `once(..)` method subscribes like [`on(..)`](#on-method), except that as soons as the event is emitted the first time, the listener is unsubscribed. This guarantees a specific event+listener will first *at most* "once".

```js
function onWhateverOnce() {
    console.log("'whatever' event fired (just once)!");
}

// subscribe to "whatever" event, but only once!
events.once("whatever",onWhateverOnce);
```

`once(..)` and `on(..)` perform the same kind of event subscription. Subsequent calls of `once(..)` or `on(..)` (in any combination) will skip any subsequent subscriptions (returning `false`). You cannot *switch* from `on(..)` to `once(..)` style subscription (or vice versa) by calling one method after the other (with the same event+listener); to switch, you must first [unsubscribe with `off(..)`](#off-method) before re-subscribing.

### `off(..)` Method

The `off(..)` method unsubscribes an event+listener that was previously subscribed with the [`on(..)`](#on-method) or [`once(..)`](#once-method) methods.

```js
function onWhatever() {
    console.log("'whatever' event fired!");
}

// unsubscribe from "whatever" event
events.off("whatever",onWhatever);
```

The method will return `true` if the event was unsubscribed, or `false` if no matching event+listener subscription could be found.

#### Alternate unsubscription

The two arguments to `off(..)` are *both optional*.

If you pass only the first *event-name* argument, but leave off the listener argument, all liseners for that event will be removed:

```js
// remove any 'whatever' listeners
events.off("whatever");
```

`true` will be returned if any event listeners are currently subscribed, or `false` otherwise.

If you instead pass only the second *listener* argument (with `null` or `undefined` for the first *event-name* argument), it will unsubscribe *all events* that have included that specific listener:

```js
function onEvent() { /* .. */ }

events.off(null,onEvent);
```

`true` will be returned if the listener is subscribed to any events, or `false` otherwise.

If you call `off()` with no arguments, *all events* with *any event listeners* are unsubscribed:

```js
// clear out all event subscriptions unconditionally!
events.off();
```

`true` will be returned if any event+listener subscription is found to remove, or `false` otherwise.

### `emit(..)` Method

To *emit* an event against all listeners on an emitter instance, call `emit(..)`:

```js
events.emit("whatever");
```

```js
// specialEvent: Symbol("special event")

events.emit(specialEvent);
```

**Note:** If a listener function throws an exception, this error will be reported to the consolve (via `console.error()`), but will not stop the `emit()` call. All handlers will be given a fair chance to execute.

Any subscription/unsubscription operations *from/during a listener execution* will NOT take effect until after all event listeners queued by `emit()` have had a chance to be invoked ([synchronously or asynchronously](#sync-vs-async-modes)).

You can optionally pass one or more arguments after the event name, which will be passed to the event listener(s):

```js
events.emit("whatever",42,[ "hello", "world" ]);
```

**Note:** This call will pass *two* arguments to the listener function(s), `42` and the array `["hello","world"]`.

#### Sync vs Async modes

If the emitter is in *sync-emit* mode (default, [configured at instance construction](#eventer-api)), any matching listener function(s) will be called synchronously during the `emit(..)` call.

```js
function onWhatever() {
    console.log("'whatever' event fired!");
}

var events = new Eventer({ asyncEmit: false });

events.on("whatever",onWhatever);
events.emit("whatever");
console.log("Done.");
// 'whatever' event fired!
// Done.
```

**Note:** The `emit()` call in *sync mode* invokes all event listeners while it is running, which is why `Done.` message is printed last.

If the emitter is in *async-emit* mode ([configured at instance construction](#eventer-api)), any matching listener function(s) **at the time of `emit()` call** will be asynchronously scheduled for the next microtask. However, `emit()` always still completes immediately.

```js
function onWhatever() {
    console.log("'whatever' event fired!");
}

var events = new Eventer({ asyncEmit: true });

events.on("whatever",onWhatever);
events.emit("whatever");
console.log("Done.");
// Done.
// 'whatever' event fired!
```

**Note:** Here (async mode), the `Done.` message is printed first, because the current stack of execution completes before the next microtask runs (and processes async scheduled event listener invocations).

### `releaseListeners(..)` Method

If using [*weak event listeners* mode](WEAK.md) (default), the `releaseListeners(..)` method is no-op (does nothing).

But if that mode is turned off (i.e., *strong event listeners* mode), the `releaseListeners(..)` mode can be used to release a specific listener, or all listeners if no argument is passed.

```js
// release specific event listener
events.releaseListeners(onWhatever);
```

```js
// release all event listeners
events.releaseListeners();
```

This method is intended for use as proactive-cleanup, under the specific circumstance when you know that the subscribed listener(s) in question *will go out of scope* (and otherwise be GC'd) in the future, and you want the event(s)+listener(s) to be implicitly unsubscribed when doing so.

In other words, it's a way to opt-in to [*weak event listeners* mode](WEAK.md), on an otherwise *strong event listeners* mode emitter instance, but **only for currently subscribed listeners** (not future subscriptions on the instance).

This differs from calling `off(null,onWhatever)` / `off()` in that `releaseListeners()` *does not* affirmatively unsubscribe the events (as `off(..)` does), but merely *allow* future implicit unsubscription.

**Note:** If you're in the circumstance where all listener(s) have already gone out of scope, and you might be tempted to call `releaseListeners()` (no arguments) to allow the GC, this circumstance is better suited to call `off()` (no arguments) instead.

## Re-building `dist/*`

If you need to rebuild the `dist/*` files for any reason, run:

```cmd
# only needed one time
npm install

npm run build:all
```

## Tests

This library only works in a browser, so its test suite must also be run in a browser.

Visit [`https://byojs.dev/eventer/`](https://byojs.dev/eventer/) and click the "run tests" button.

### Run Locally

To instead run the tests locally, first make sure you've [already run the build](#re-building-dist), then:

```cmd
npm test
```

This will start a static file webserver (no server logic), serving the interactive test page from `http://localhost:8080/`; visit this page in your browser and click the "run tests" button.

By default, the `test/test.js` file imports the code from the `src/*` directly. However, to test against the `dist/*` files (as included in the npm package), you can modify `test/test.js`, updating the `/src` in its `import` statements to `/dist` (see the import-map in `test/index.html` for more details).

## License

[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

All code and documentation are (c) 2024 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
