# Weak Event Listeners

*Weak event listeners* is a pattern for managing the subscription of events, where the emitter holds a reference to the listener (function) *weakly*. This is a powerful capability, but it requires much more careful attention by the developer to make sure it's being used appropriately.

JS only recently (last few years) gained the ability to properly support *weak event listeners*, which is likely the primary reason that almost no other event emitter implementations besides **Eventer** support this. This capability will probably gain more traction going forward.

## Background: Garbage

Garbage Collection (GC) is a background process that the JS engine applies, to free up memory it previously allocated (for values, variables, function scopes, etc), once those elements are no longer *in scope* (aka *reachable*).

For example, creating a large array (thousands of elements or more) might take up a non-trivial amount of memory (hundreds or thousands of KB, or even MB). Once you're done using that array, your app *should* clean that up so the JS engine to reclaim that memory.

**Tip:** Even if you don't care that much, the users of your application might! Memory waste contributes to slower applications, faster battery drain, etc.

If there's a large value (object, array, function closure, etc), and four different references to that value have been set (in variables, object properties, function parameters, etc), that value will stay in memory until **all four** references are cleaned up. Once they are, the large value itself is now *unreachable*, and the JS engine knows it's now safe to free up that memory.

From the JS code perspective, all you need to do to *cleanup* is to unset that large value by setting its variable/container to another value, typically `null` or `undefined`. That's actually all you *can* do. The JS engine's GC does the rest. But it does so in the background, based on a variety of complicated decision and timing factors that are completely *opaque* to us JS developers.

**Note:** Though you cannot programmatically control GC -- only *influence* it -- from your JS program, various browsers do provide developers non-programmatic access to trigger GC (for debugging/analysis purposes). For example, in Chrome (desktop) devtools, there's a "Memory" tab, and on there a button called "Collect Garbage". In Firefox (desktop), there's an `about:memory` page you open a tab to, with a "GC" button.

### Memory "Leaks"

The classic definition of a "memory leak" means memory that can never be reclaimed. In other words, memory that was allocated in some way, but the handle to that memory has been discarded, and now that memory that can't be de-allocated; the only "solution" is to restart a process (e.g., browser, tab), or even a device.

With modern, well-behaving JS engines, true JS program "memory leaks" -- in that classic sense, anyway -- are exceedingly rare. However, JS programs can absolutely *accrete* memory (not technically leaking) throughout their lifetime, where they are accidentally holding onto memory they're no longer using, and the GC isn't able to cleanup for us. This leads to GC prevention.

The most classic example of this is when a large value (array, object) is referenced/used in a function, and that function is registered as an event listener. Even if the program never references that value to use it again, the value is nonetheless kept around, because the JS engine has to assume that possibly, that event might fire to call the listener, where it'd be expecting that value to still be there. This is called "accidental closure".

Even if the program intentionally unsets all its own references to that function (closure), an event emitter would typically hold a *strong* reference to that listener function, and thus prevent its GC (and the GC of the large array/object value).

Explicitly unregistering an no-longer-used event listener is the easiest way to avoid this particular type of GC prevention.

But this is typically challenging in complex apps, to keep track of the appropriate lifetimes of all events.

### Precedence

A quick google search can confirm that "weak event listeners" is not a new idea, or only related to JS. Many other languages/systems have such capabilities, and have relied on them for a long time.

JS is still comparitively *brand new* to this trend.

### JS Weakness

JS has historically not supported *weak references*, which meant it was actually impossible to implement a *weak event listener* emitter.

**Note:** There was good reason for JS to resist adding such features. There was (and still is!) concern that exposing the activity of a GC (background process) into the observable behavior of a JS program, could create potential security/privacy vulnerabilities, as well as lead to harder to understand/debug JS programs. Moreover, these features make it harder for JS engines to perform some types of optimizations.

Back in ES6 (2015), JS added `WeakMap` (and `WeakSet`), but these only provide part of the solution. A `WeakMap` only holds its *key* weakly, but its value strongly; the reverse is actually what's needed for a *weak event listener* system.

`WeakSet` holds its values weakly (good!), but is not enumerable (bad!). Without enumerability, an event emitter isn't able to get a list of all listeners to fire when you emit an event.

Only in the last couple of years did JS finally address the *design weakness* in this respect, by finally providing [`WeakRef`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) and [`FinalizationRegistry`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry). Now, *weak event listener* implementations are fully possible.

But it's a very nascent area of capability for JS, given the feature newness. Most JS developers either don't know this is possible, or don't even understand what it's for to begin with!

## Weakly-held listeners

By weakly holding event listeners, the GC prevention (by "accidental closure") problem discussed above is more likely avoided. The emitter instance **DOES NOT** prevent the listener function -- and particularly, anything the function has a closure over! -- from being cleaned up by GC (garbage collection).

That means, if you the developer properly clean up (or don't hold in the first place!) any references to listeners, you *don't need* to also unsubscribe them from the event emitter. Once the JS engine GC cleans up those listeners (and closures!), the event emitter will basically "detect" this and implicitly remove the subscriptions automatically.

Usage of a *weak event listener* emitter gives you much finer control over the memory allocation behavior. This capability is a big win, if understood by JS developers, and properly and safely used in their programs.

## Weak Weaknesses

As a wise grandpa once said:

> With great power comes great responsibility.

The downside (err... *weakness*) of a *weak event listener* emitter is that it's possible, depending on the habits of how you use it, to create very unpredictable behavior (and maddening program bugs!).

[As described here](README.md#accidental-unsubscription), if you aren't careful to keep any other references to a listener -- for example, passing only an inline function (e.g., `=>` arrow function) -- the JS engine's GC *will (eventually() do its job*, and clean up those functions/closures (and unsubscribe the events in **Eventer**).

```js
function listenToWhatever() {
    events.on(
        "whatever",
        () => console.log("'whatever' event fired!")
    );
}

listenToWhatever();
// "whatever" events might fire after here for awhile,
// then all of a sudden stop firing (because of GC)!
```

That means you might be observing event handlers firing the way you want, and suddently they'd stop firing, even though nothing else in the program changed. That would happen unpredictably, as the background GC process runs.

Hopefully, it's clear just how *dangerous* it is to have unpredictable program behavior like that!

## Solution

The only plausible solution here, while still taking advantage of *weak event listeners* capabiliity when it's actually helpful, is to ensure you only ever pass event listener functions that are stably and predictably referenced elsehwere in the program.

In practice, this basically means, **never pass inline listener functions** to a *weak event listener* emitter subscription. Moreover, be careful even with inner function declarations, if the enclosing scope might go away via GC.

Always store references to functions used as a event listeners in objects (or classes) that survive beyond single function scopes, or even directly in module/global scope, so the listeners never *accidentally* go away.

When you *want* to cleanup a function no longer being used, you can just unset its value specifically, and let the GC and *weak event listener* capability implicitly clean up the event subscription.

Of course, that doesn't stop you from *also* explicitly unsubscribing events. Both explicit and implicit cleanup here work together to provide a more memory-optimized application design.
