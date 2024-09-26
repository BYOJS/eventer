// Parts of this implementation adapted from:
//   https://stackoverflow.com/a/78908317
//   https://github.com/tc39/proposal-weakrefs/blob/
//     a13c3efc5d3b547e05731fa2af7e50348cf61173/README.md#iterable-listenerMaps

var finalization = new FinalizationRegistry(
	({ refs, ref, signalRefs, }) => {
		removeFromList(refs,ref);
		if (signalRefs != null) {
			for (
				let { signalRef, onAbortSignalRef, } of
					Object.values(signalRefs)
			) {
				// note: these may very well have already been
				// GC'd, so there may be nothing to do here
				let signal = signalRef.deref();
				let onAbortSignal = onAbortSignalRef.deref();
				if (signal != null && onAbortSignal != null) {
					signal.removeEventListener("abort",onAbortSignal);
				}
			}
		}
	}
);
var Eventer = defineEventerClass();


// ***********************

export { Eventer, };
export default Eventer;


// ***********************

// note: this function "hoists" the class
// definition above the `export`s, for
// desired file layout-order without TDZ,
// and also wraps it in a proxy to provide
// both a `new` constructor form and a
// regular factory function form
function defineEventerClass() {
	class Eventer {
		#listenerEntries = new WeakMap();
		#listenerRefsByEvent = {};
		#listenerSet;
		#asyncEmit;

		constructor({
			weakListeners = true,
			asyncEmit = false,
		} = {}) {
			this.#listenerSet = (!weakListeners ? new Set() : null);
			this.#asyncEmit = asyncEmit;
		}

		// note: only usable in `weakListeners:false` mode
		releaseListeners(listener) {
			if (listener != null) {
				this.#listenerSet?.delete(listener);
			}
			else {
				this.#listenerSet?.clear();
			}
		}

		on(eventName,listener,{ signal, } = {}) {
			// already-aborted AbortSignal passed in?
			if (signal != null && signal.aborted) return false;

			// if not in "weak-listeners" mode, store a
			// reference to prevent GC
			this.#listenerSet?.add(listener);

			// retrieve (weakly linked) listener entry (if any)
			var listenerEntry = this.#listenerEntries.get(listener);

			// first time registering this listener?
			if (listenerEntry == null) {
				// (weakly) hold reference to listener (to allow
				// GC of listener by host program)
				let listenerRef = new WeakRef(listener);

				// (strongly) link listener-weak-ref to event
				this.#listenerRefsByEvent[eventName] = (
					this.#listenerRefsByEvent[eventName] ?? []
				);
				this.#listenerRefsByEvent[eventName].push(listenerRef);

				listenerEntry = {
					// register event on listener entry
					events: [ eventName, ],
					onceEvents: [],
					ref: listenerRef,
				};

				// (weakly) link listener to its entry
				this.#listenerEntries.set(listener,listenerEntry);

				// AbortSignal passed in?
				if (signal != null) {
					// weakly hold reference to signal, to
					// remove its event listener later
					let signalRef = new WeakRef(signal);

					// handler for when signal is aborted
					let onAbortSignal = () => {
						// weak reference still points at a
						// signal?
						var theSignal = signalRef.deref();
						var theHandler = onAbortSignalRef.deref();
						if (theSignal != null && theHandler != null) {
							theSignal.removeEventListener("abort",theHandler);
						}

						// weak reference still points at a
						// listener?
						var listener = listenerRef.deref();
						if (listener != null) {
							this.off(eventName,listener);
						}
					};
					let onAbortSignalRef = new WeakRef(onAbortSignal);

					signal.addEventListener("abort",onAbortSignal);

					// save signal/handler weak references for later
					// unsubscription, upon GC of listener
					listenerEntry.signalRefs = {
						[eventName]: {
							signalRef,
							onAbortSignalRef,
						},
					};
				}

				// listen for GC of listener, to unregister any
				// event subscriptions (clean up memory)
				finalization.register(
					listener,
					{
						refs: this.#listenerRefsByEvent[eventName],
						ref: listenerRef,
						signalRefs: listenerEntry.signalRefs,
					},
					listenerRef
				);

				return true;
			}
			// listener entry does NOT have this event registered?
			else if (!listenerEntry.events.includes(eventName)) {
				let listenerRef = listenerEntry.ref;

				// register event on listener entry
				listenerEntry.events.push(eventName);

				// (strongly) link listener-weak-ref to event
				this.#listenerRefsByEvent[eventName] = (
					this.#listenerRefsByEvent[eventName] ?? []
				);
				this.#listenerRefsByEvent[eventName].push(listenerRef);

				// AbortSignal passed in?
				if (signal != null) {
					// weakly hold reference to signal, to
					// remove its event listener later
					let signalRef = new WeakRef(signal);

					// handler for when signal is aborted
					let onAbortSignal = () => {
						// weak reference still points at a
						// signal?
						var theSignal = signalRef.deref();
						var theHandler = onAbortSignalRef.deref();
						if (theSignal != null && theHandler != null) {
							theSignal.removeEventListener("abort",theHandler);
						}

						// weak reference still points at a
						// listener?
						var listener = listenerRef.deref();
						if (listener != null) {
							this.off(eventName,listener);
						}
					};
					let onAbortSignalRef = new WeakRef(onAbortSignal);

					signal.addEventListener("abort",onAbortSignal);

					// save signal/handler weak references for later
					// unsubscription, upon GC of listener
					listenerEntry.signalRefs = listenerEntry.signalRefs ?? {};
					listenerEntry.signalRefs[eventName] = {
						signalRef,
						onAbortSignalRef,
					};
				}

				return true;
			}

			return false;
		}

		once(eventName,listener,opts) {
			if (this.on(eventName,listener,opts)) {
				// (weakly) remember that this is a "once"
				// registration (to unregister after first
				// `emit()`)
				this.#listenerEntries.get(listener)
					.onceEvents.push(eventName);

				return true;
			}

			return false;
		}

		off(eventName,listener) {
			var listenerRecords = (
				(
					// unsubscribe all listeners?
					listener == null ?
						// get all listener-weak-refs for event
						// (or all of them, if no event specified)
						this.#getListenerRefs(eventName) :

						// otherwise, unsubscribe specific listener
						(
							(
								// listener has been registered?
								this.#listenerEntries.has(listener) &&

								(
									// unregistering all events?
									eventName == null ||

									// or specific event registered?
									this.#listenerEntries.get(listener)
										.events.includes(eventName)
								)
							) ?
								[ this.#listenerEntries.get(listener).ref ] :

								// nothing to do (no listener+event)
								[]
						)
				)
				.map(ref => [ ref.deref(), ref, ])
				.filter(([ listenerFn, ]) => !!listenerFn)
				.map(([ listenerFn, listenerRef, ]) => [
					listenerFn,
					listenerRef,
					this.#listenerEntries.get(listenerFn),
				])
			);

			// any listeners to unsubscribe?
			if (listenerRecords.length > 0) {
				// process unsubscription(s)
				for (let [ listenerFn, listenerRef, listenerEntry, ] of
					listenerRecords
				) {
					if (eventName != null) {
						// unlink event from listener entry
						removeFromList(listenerEntry.events,eventName);
						removeFromList(listenerEntry.onceEvents,eventName);

						// unlink listener-weak-ref from event
						removeFromList(
							this.#listenerRefsByEvent[eventName],
							listenerRef
						);

						// all listener-weak-refs now unlinked from event?
						if (this.#listenerRefsByEvent[eventName].length == 0) {
							this.#listenerRefsByEvent[eventName] = null;
						}

						// abort signal (for event) to clean up?
						if (listenerEntry.signalRefs?.[eventName] != null) {
							let signal = listenerEntry.signalRefs[eventName].signalRef.deref();
							let onAbortSignal = listenerEntry.signalRefs[eventName].onAbortSignalRef.deref();
							if (signal != null && onAbortSignal != null) {
								signal.removeEventListener("abort",onAbortSignal);
							}
							delete listenerEntry.signalRefs[eventName];
						}
					}
					else {
						// note: will trigger (below) deleting the
						// whole entry, which is why we don't need
						// to empty `onceEvents` list
						listenerEntry.events.length = 0;

						for (let [ evt, refList, ] of
							Object.entries(this.#listenerRefsByEvent)
						) {
							removeFromList(refList,listenerRef);

							// all listener-weak-refs now removed from
							// this event?
							if (refList?.length == 0) {
								this.#listenerRefsByEvent[evt] = null;
							}
						}

						// abort signal(s) to cleanup?
						if (listenerEntry.signalRefs != null) {
							for (
								let { signalRef, onAbortSignalRef, } of
									Object.values(listenerEntry.signalRefs)
							) {
								let signal = signalRef.deref();
								let onAbortSignal = onAbortSignalRef.deref();
								if (signal != null && onAbortSignal != null) {
									signal.removeEventListener("abort",onAbortSignal);
								}
							}
							delete listenerEntry.signalRefs;
						}
					}

					// all events now unlinked from listener entry?
					if (listenerEntry.events.length == 0) {
						// release any GC-protection of listener
						this.releaseListeners(listenerFn);

						// delete the whole entry
						this.#listenerEntries.delete(listenerFn);

						// stop listening for GC
						finalization.unregister(listenerRef);
					}
				}

				return true;
			}

			return false;
		}

		emit(eventName,...args) {
			var listeners = (
				(this.#listenerRefsByEvent[eventName] || [])
				.map(ref => ref.deref())
				.filter(Boolean)
			);
			if (listeners.length > 0) {
				let onceEventUnsubscribers = new Map(
					listeners
						// were any listeners of this event of the
						// "once" type?
						.filter(listener => (
							// was this registered as a "once" listener?
							this.#listenerEntries.get(listener)
								.onceEvents.includes(eventName)
						))

						// produce list of entries ([key,value] tuples)
						// to popuplate `onceEventUnsubscribers` Map
						.map(onceListener => [
							onceListener,
							() => this.off(eventName,onceListener),
						])
				);
				let triggerEvents = () => {
					for (let listener of listeners) {
						// was this listener a "once" listener?
						if (onceEventUnsubscribers.has(listener)) {
							// run the unsubscriber
							onceEventUnsubscribers.get(listener)();
							onceEventUnsubscribers.delete(listener);
						}

						try {
							listener.apply(this,args);
						}
						catch (err) {
							console.error(err);
						}
					}
					listeners = onceEventUnsubscribers = triggerEvents = null;
				};

				// in async-emit mode?
				if (this.#asyncEmit) {
					// trigger event on next async microtask
					Promise.resolve().then(triggerEvents);

					// process unsubscribes immediately
					for (let unsubscribe of onceEventUnsubscribers.values()) {
						unsubscribe();
					}
					onceEventUnsubscribers.clear();
				}
				else {
					triggerEvents();
				}

				return true;
			}

			return false;
		}

		#getListenerRefs(eventName) {
			return (
				eventName == null ? (
					// flattened list of all registered
					// listener-weak-refs
					Object.values(this.#listenerRefsByEvent)
					.flatMap(refs => refs ?? [])
				) :

				// list of all event's listener-weak-refs (if any)
				(this.#listenerRefsByEvent[eventName] ?? [])
			);
		}
	};

	// proxy to let `Eventer()` be both a constructor (via
	// `new`) and a regular factory function
	return new Proxy(Eventer,{
		construct(target,args,receiver) {
			return Reflect.construct(target,args,receiver);
		},
		apply(target,thisArg,args) {
			return Reflect.construct(target,args);
		},
		getPrototypeOf(target) {
			return Reflect.getPrototypeOf(target);
		},
		setPrototypeOf() {
			return true;
		},
		get(target,prop,receiver) {
			return Reflect.get(target,prop,receiver);
		},
		set(obj,prop,value) {
			return Reflect.set(obj,prop,value);
		},
	});
}

function removeFromList(list,val) {
	var idx = list?.indexOf(val);
	if (~(idx ?? -1)) {
		list.splice(idx,1);
	}
}
