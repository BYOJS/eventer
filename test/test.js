// note: this module specifier comes from the import-map
//    in index.html; swap "src" for "dist" here to test
//    against the dist/* files
import Eventer from "eventer/src";


// ***********************

var testResultsEl;
var weakTests = {};

if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",ready,false);
}
else {
	ready();
}


// ***********************

async function ready() {
	var runWeakTestsPart1Btn = document.getElementById("run-weak-tests-part-1-btn");
	var runWeakTestsPart2Btn = document.getElementById("run-weak-tests-part-2-btn");
	testResultsEl = document.getElementById("test-results");

	runWeakTestsPart1Btn.addEventListener("click",runWeakTestsPart1);
	runWeakTestsPart2Btn.addEventListener("click",runWeakTestsPart2);

	try {
		await runAutoTests();
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Automated Tests) FAILED -- see console";
	}

	runWeakTestsPart1Btn.disabled = false;
}

async function runAutoTests() {
	testResultsEl.innerHTML = "Running automated tests...<br>";

	for (let testFn of [ runSyncTests, runAsyncTests, ]) {
		let result = await testFn();
		if (!result) {
			return;
		}
	}

	testResultsEl.innerHTML += "(All automated tests) PASSED.<br>";
}

async function runSyncTests() {
	var results = [];
	var expected = [
		true,
		false,
		true,
		false,
		"A: 0",
		"B: 0",
		true,
		"A: 1",
		true,
		"A: 2",
		true,
		false,
		"A: 4",
		true,
		true,
		false,
		false,
		true,
		true,
		false,
		true,
		true,
		"C: 7",
		"D: 8",
		"D: -9",
		true,
		true,
		true,
		true,
		true,
		true,
		false,
		true,
		false,
		false,
		false,
		false,
		false,
		true,
		"A: 16",
		true,
		false,
	];

	try {
		// NOTE: `var`s intentional here, for hoisting
		// outside the `try` block
		var events = new Eventer({ asyncEmit: false, weakListeners: false, });
		var counter = 0;
		var symbolEvent = Symbol("symbol event");

		results.push( events.on("test",A) );
		results.push( events.on("test",A) );
		results.push( events.once("test",B) );
		results.push( events.once("test",B) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test-2",counter++) );
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",A) );
		results.push( events.off("test",A) );
		results.push( events.emit("test",counter++) );
		results.push( events.on("test",A) );
		results.push( events.off("test",A) );
		results.push( events.emit("test",counter++) );
		results.push( events.on("test",C) );
		results.push( events.on("test-2",D) );
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",C) );
		results.push( events.off("test-2",D) );
		results.push( events.once("test-2",D) );
		results.push( events.emit("test",counter++) );
		results.push( events.off("test-2",D) );
		events.on("test",A);
		events.on("test",B);
		events.off("test");
		results.push( events.emit("test",counter++) );
		events.on("test",A);
		events.on("test-2",A);
		events.off(null,A);
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test-2",counter++) );
		events.on("test",A);
		events.on("test-2",A);
		events.on("test",B);
		events.on("test-2",B);
		events.off();
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test-2",counter++) );
		results.push( events.once(symbolEvent,A) );
		results.push( events.emit(symbolEvent,counter++) );
		results.push( events.emit(symbolEvent,counter++) );

		if (JSON.stringify(results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Sync Tests) PASSED.<br>";
			return true;
		}
		else {
			testResultsEl.innerHTML += `(Sync Tests) FAILED:<br>&nbsp;&nbsp;<strong>expected</strong> '${expected.join(",")}'<br>&nbsp;&nbsp;<strong>found</strong> '${results.join(",")}'<br>`;
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML += "(Sync Tests) FAILED -- see console<br>";
	}
	return false;


	// ***********************

	function A(msg) {
		results.push(`A: ${msg}`);
	}

	function B(msg) {
		results.push(`B: ${msg}`);
	}

	function C(msg) {
		results.push(`C: ${msg}`);
		results.push( events.emit("test-2",counter++) );
	}

	function D(msg) {
		results.push(`D: ${msg}`);
		if (msg > 0) {
			results.push( events.emit("test-2",-1 * (counter++)) );
		}
	}
}

async function runAsyncTests() {
	var results = [];
	var expected = [
		true,
		false,
		true,
		false,
		true,
		true,
		true,
		false,
		"A: 0",
		"B: 0",
		"A: 1",
		"A: 2",
		true,
		"A: 4",
		true,
		false,
		false,
		true,
		true,
		false,
		true,
		true,
		true,
		"A: 7",
		true,
		true,
		true,
		"C: 8",
		true,
		"D: 9",
		true,
		"D: -10",
		true,
		true,
		true,
		true,
		"C: 11",
		true,
		"D: 12",
		false,
		false,
	];

	try {
		// NOTE: `var`s intentional here, for hoisting
		// outside the `try` block
		var events = new Eventer({ asyncEmit: true, weakListeners: false, });
		var counter = 0;

		results.push( events.on("test",A) );
		results.push( events.on("test",A) );
		results.push( events.once("test",B) );
		results.push( events.once("test",B) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test",counter++) );
		results.push( events.emit("test-2",counter++) );
		await timeout(0);
		results.push( events.emit("test",counter++) );
		await timeout(0);
		results.push( events.off("test",A) );
		results.push( events.off("test",A) );
		results.push( events.emit("test",counter++) );
		await timeout(0);
		results.push( events.on("test",A) );
		results.push( events.off("test",A) );
		results.push( events.emit("test",counter++) );
		await timeout(0);
		results.push( events.on("test",A) );
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",A) );
		await timeout(0);
		results.push( events.on("test",C) );
		results.push( events.emit("test",counter++) );
		results.push( events.on("test-2",D) );
		await timeout(0);
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",C) );
		results.push( events.off("test-2",D) );
		results.push( events.once("test-2",D) );
		await timeout(0);
		results.push( events.off("test-2",D) );

		if (JSON.stringify(results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Async Tests) PASSED.<br>";
			return true;
		}
		else {
			testResultsEl.innerHTML += `(Async Tests) FAILED:<br>&nbsp;&nbsp;<strong>expected</strong> '${expected.join(",")}'<br>&nbsp;&nbsp;<strong>found</strong> '${results.join(",")}'<br>`;
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML += "(Async Tests) FAILED -- see console<br>";
	}
	return false;


	// ***********************

	function A(msg) {
		results.push(`A: ${msg}`);
	}

	function B(msg) {
		results.push(`B: ${msg}`);
	}

	function C(msg) {
		results.push(`C: ${msg}`);
		results.push( events.emit("test-2",counter++) );
	}

	function D(msg) {
		results.push(`D: ${msg}`);
		if (msg > 0) {
			results.push( events.emit("test-2",-1 * (counter++)) );
		}
	}
}

async function runWeakTestsPart1() {
	testResultsEl.innerHTML = "Running weak tests (part 1)...<br>";
	var expected = [
		"A: 0",
		"B: 0",
		"C: 0",
		true,
		"A: 1",
		"B: 1",
		"C: 1",
		true,
		"A: 2",
		"B: 2",
		true,
		"A: 3",
		"B: 3",
		true,
		"D: 4",
		true,
	];
	weakTests.results = [];
	weakTests.listeners = {
		A(msg) {
			weakTests.results.push(`A: ${msg}`);
		},
		B(msg) {
			weakTests.results.push(`B: ${msg}`);
		},
		C(msg) {
			weakTests.results.push(`C: ${msg}`);
		},
		D(msg) {
			weakTests.results.push(`D: ${msg}`);
		},
	};
	weakTests.events1 = new Eventer({ asyncEmit: false, weakListeners: true, });
	weakTests.events2 = new Eventer({ asyncEmit: false, weakListeners: false, });
	weakTests.events3 = new Eventer({ asyncEmit: false, weakListeners: false, });
	weakTests.finalization = new FinalizationRegistry(
		(val) => weakTests.results.push(`removed: ${val}`)
	);
	weakTests.finalization.register(weakTests.listeners.A,"A");
	weakTests.finalization.register(weakTests.listeners.B,"B");
	weakTests.finalization.register(weakTests.listeners.B,"C");
	weakTests.finalization.register(weakTests.events3,"events3");

	try {
		var counter = 0;
		weakTests.events1.on("test",weakTests.listeners.A);
		weakTests.events1.on("test",weakTests.listeners.B);
		weakTests.events1.on("test",weakTests.listeners.C);
		weakTests.events1.once("test-2",weakTests.listeners.A);
		weakTests.events1.once("test-2",weakTests.listeners.B);
		weakTests.events1.once("test-3",weakTests.listeners.A);
		weakTests.events1.once("test-3",weakTests.listeners.B);
		weakTests.events2.on("test",weakTests.listeners.A);
		weakTests.events2.on("test",weakTests.listeners.B);
		weakTests.events2.on("test",weakTests.listeners.C);
		weakTests.events2.once("test-2",weakTests.listeners.A);
		weakTests.events2.once("test-2",weakTests.listeners.B);
		weakTests.events2.once("test-3",weakTests.listeners.A);
		weakTests.events2.once("test-3",weakTests.listeners.B);
		weakTests.events3.on("test",weakTests.listeners.D);

		weakTests.results.push( weakTests.events1.emit("test",counter++) );
		weakTests.results.push( weakTests.events2.emit("test",counter++) );
		weakTests.results.push( weakTests.events1.emit("test-2",counter++) );
		weakTests.results.push( weakTests.events2.emit("test-2",counter++) );
		weakTests.results.push( weakTests.events3.emit("test",counter++) );

		if (JSON.stringify(weakTests.results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Weak Tests Part 1) PASSED...<br>";

			weakTests.results.length = 0;
			weakTests.events2.releaseListeners(weakTests.listeners.A);
			weakTests.events2.releaseListeners();
			weakTests.events3 = null;
			weakTests.listeners = null;

			testResultsEl.innerHTML += "<br><strong>NOW: Please trigger a GC event in the browser</strong> before running the 'Part 2' tests.<br><small>(see instructions above for Chrome or Firefox browsers)<br><br>";

			document.getElementById("run-weak-tests-part-2-btn").disabled = false;
		}
		else {
			testResultsEl.innerHTML += `(Weak Tests Part 1) FAILED:<br>&nbsp;&nbsp;<strong>expected</strong> '${expected.join(",")}'<br>&nbsp;&nbsp;<strong>found</strong> '${results.join(",")}'<br>`;
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Weak Tests Part 1) FAILED -- see console";
	}
	return false;
}

async function runWeakTestsPart2() {
	testResultsEl.innerHTML += "Running weak tests (part 2)...<br>";
	var expected = [
		"removed: A",
		"removed: B",
		"removed: C",
		"removed: events3",
		false,
		false,
		false,
		false,
	];
	weakTests.finalization = null;

	try {
		var counter = 0;

		weakTests.results.push( weakTests.events1.emit("test",counter++) );
		weakTests.results.push( weakTests.events2.emit("test",counter++) );
		weakTests.results.push( weakTests.events1.off() );
		weakTests.results.push( weakTests.events2.off() );

		// normalize unpredictable finalization-event ordering
		weakTests.results.sort((v1,v2) => (
			typeof v1 == "string" ? (
				typeof v2 == "string" ? v1.localeCompare(v2) : 0
			) : 1
		));

		if (JSON.stringify(weakTests.results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Weak Tests Part 2) PASSED.<br>";
			return true;
		}
		else {
			testResultsEl.innerHTML += `(Weak Tests Part 2) FAILED:<br>&nbsp;&nbsp;<strong>expected</strong> '${expected.join(",")}'<br>&nbsp;&nbsp;<strong>found</strong> '${weakTests.results.join(",")}'<br>`;
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Weak Tests Part 2) FAILED -- see console";
	}
	finally {
		weakTests.events1 = weakTests.events2 = weakTests.results = null;
	}
	return false;
}

function timeout(ms) {
	return new Promise(res => setTimeout(res,ms));
}

function logError(err,returnLog = false) {
	var err = `${
			err.stack ? err.stack : err.toString()
		}${
			err.cause ? `\n${logError(err.cause,/*returnLog=*/true)}` : ""
	}`;
	if (returnLog) return err;
	else console.error(err);
}
