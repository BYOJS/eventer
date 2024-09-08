// Parts of this implementation adapted from:
//   https://stackoverflow.com/a/78908317
//   https://github.com/tc39/proposal-weakrefs/blob/
//     a13c3efc5d3b547e05731fa2af7e50348cf61173/README.md#iterable-listenerMaps

var finalization = new FinalizationRegistry(
	({ refs, ref, }) => (
		console.log("removed",refs.length),
		removeFromList(refs,ref),
		console.log(refs.length)
	)
);
var Eventer = defineEventerClass();


// ***********************

export { Eventer, };
export default Eventer;


// ***********************

// note: this function "hoists" the class
// definition above the `export`s, for
// desired file layout-order without TDZ
function defineEventerClass() {
	return class Eventer {
		#listenerEntries = new WeakMap();
		#listenerRefsByEvent = {};
		#listenerSet;
		#asyncEmit;

	  	constructor({
	  		weakListeners = true,
	  		asyncEmit = false,
	  	} = {}) {
	  		if (!weakListeners) {
	  			this.#listenerSet = new Set();
	  		}
			this.#asyncEmit = asyncEmit;
		}

		releaseListeners(listener) {
			if (this.#listenerSet != null) {
				if (listener != null) {
					this.#listenerSet.delete(listener);
				}
				else {
					this.#listenerSet.clear();
				}
			}
		}

		on(eventName,listener) {
			// if not in "weak-listeners" mode, store a
			// reference to prevent GC
			if (this.#listenerSet != null) {
				this.#listenerSet.add(listener);
			}

			// retrieve (weakly linked) listener entry (if any)
			var listenerEntry = this.#listenerEntries.get(listener);

			// first time registering this listener?
			if (listenerEntry == null) {
				// (weakly) hold reference to listener (to allow
				// GC of listener by host program)
				let listenerRef = new WeakRef(listener);

				// (strongly) link listener-weak-ref to event
				this.#listenerRefsByEvent[eventName] = (
					this.#listenerRefsByEvent[eventName] || []
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

				// listen for GC of listener, to unregister any
				// event subscriptions (clean up memory)
				finalization.register(
					listener,
					{
						refs: this.#listenerRefsByEvent[eventName],
						ref: listenerRef,
					},
					listenerRef
				);

				return true;
			}
			// listener entry does NOT have this event registered?
			else if (!listenerEntry.events.includes(eventName)) {
				// register event on listener entry
				listenerEntry.events.push(eventName);

				// (strongly) link listener-weak-ref to event
				this.#listenerRefsByEvent[eventName] = (
					this.#listenerRefsByEvent[eventName] || []
				);
				this.#listenerRefsByEvent[eventName].push(listenerEntry.ref);

				return true;
			}

			return false;
		}

		once(eventName,listener) {
			if (this.on(eventName,listener)) {
				// (weakly) remember that this is a "once"
				// registration (to unregister after first
				// `emit()`)
				this.#listenerEntries.get(listener).onceEvents.push(eventName);

				return true;
			}

			return false;
		}

		off(eventName,listener) {
			var listenerRefs = (
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
			);

			// any listeners to unsubscribe?
			if (listenerRefs.length > 0) {
				let listenerRecords = (
					listenerRefs
						.map(ref => [ ref.deref(), ref, ])
						.filter(([ listenerFn, ]) => !!listenerFn)
						.map(([ listenerFn, listenerRef, ]) => [
							listenerFn,
							listenerRef,
							this.#listenerEntries.get(listenerFn),
						])
				);

				// process unsubscription(s)
				for (let [ listenerFn, listenerRef, listenerEntry, ] of listenerRecords) {
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
					}
					else {
						// note: will trigger (below) deleting the
						// whole entry, which is why we don't need
						// to empty `onceEvents` list
						listenerEntry.events.length = 0;

						for (let [ evt, refList, ] of Object.entries(this.#listenerRefsByEvent)) {
							removeFromList(refList,listenerRef);

							// all listener-weak-refs now unlinked from event?
							if (refList.legnth == 0) {
								this.#listenerRefsByEvent[evt] = null;
							}
						}
					}

					// all events now unlinked from listener entry?
					if (listenerEntry.events.length == 0) {
						// release any GC-prevention of listener
						this.releaseListeners(listenerFn);

						// delete the whole entry
						this.#listenerEntries.delete(listenerFn);

						// stop listening for GC
						finalization.unregister(listenerRef);

					}
				}
			}

			return true;
		}

		emit(eventName,...args) {
			console.log(this.#listenerRefsByEvent[eventName]);

			var listeners = (
				(this.#listenerRefsByEvent[eventName] || [])
				.map(ref => ref.deref())
				.filter(Boolean)
			);
			if (listeners.length > 0) {
				let onceListeners = listeners.filter(listener => (
					this.#listenerEntries.get(listener).onceEvents.includes(eventName)
				));
				let triggerEvent = () => {
					for (let listener of listeners) {
						try {
							listener(...args);
						}
						catch (err) {
							console.error(err);
						}

						// was this registered as a "once" listener?
						if (onceListeners.includes(listener)) {
							this.off(eventName,listener);
						}
					}
					triggerEvent = listeners = onceListeners = null;
				};

				// in async-emit mode?
				if (this.#asyncEmit) {
					// trigger event on next async microtask
					Promise.resolve().then(triggerEvent);
				}
				else {
					triggerEvent();
				}

				return true;
			}

			return false;
		}

		#getListenerRefs(eventName) {
			return (
				eventName == null ? (
					Object.values(this.#listenerRefsByEvent)
					.flatMap(refs => refs)
				) :

				(this.#listenerRefsByEvent[eventName] ?? [])
			);
		}
	};
}

function removeFromList(list,val) {
	if (Array.isArray(list)) {
		let idx = list.indexOf(val);
		if (idx != -1) {
			list.splice(idx,1);
		}
	}
}
