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
	var runAutomatedTestsBtn = document.getElementById("run-automated-tests-btn");
	var runWeakTestsPart1Btn = document.getElementById("run-weak-tests-part-1-btn");
	testResultsEl = document.getElementById("test-results");

	runAutomatedTestsBtn.addEventListener("click",runAutomatedTests);
	runWeakTestsPart1Btn.addEventListener("click",runWeakTestsPart1);

	try {
		await runAutomatedTests();
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Automated Tests) FAILED -- see console";
	}

	runWeakTestsPart1Btn.disabled = false;
}

async function runAutomatedTests() {
	cleanupWeakTestsButtons();

	testResultsEl.innerHTML = "Running automated tests...<br>";

	for (let testFn of [ runSyncTests, runAsyncTests, ]) {
		let result = await testFn();
		testResultsEl.innerHTML += "<br>";
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
		"A: 0 (true)",
		"B: 0",
		true,
		"A: 1 (true)",
		true,
		"A: 2 (true)",
		true,
		false,
		"A: 4 (true)",
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
		"A: 16 (true)",
		true,
		false,
		true,
		"A2: 18 (true)",
		true,
		false,
		"MyEventer.on",
		true,
		"MyEventer.customEmit",
		"A3: 19 (true)",
		true,
		false,
		true,
		"A: 20 (true)",
		true,
		false,
		false,
		false,
		true,
		false,
		false,
		true,
		true,
		true,
		"A: 23 (true)",
		true,
		"A: 24 (true)",
		true,
		"A: 25 (true)",
		true,
		false,
		false,
		"A: 28 (true)",
		true,
		false,
		false,
		false,
		false,
	];

	class MyEventer extends Eventer {
		on(...args) {
			results.push("MyEventer.on");
			return super.on(...args);
		}
		customEmit(...args) {
			results.push("MyEventer.customEmit");
			return this.emit(...args);
		}
	}

	try {
		// NOTE: `var`s intentional here, for hoisting
		// outside the `try` block
		var events = new Eventer({ asyncEmit: false, weakListeners: false, });
		var events2 = Eventer({ asyncEmit: false, weakListeners: false, });
		var events3 = new MyEventer({ asyncEmit: false, weakListeners: false, });
		var counter = 0;
		var symbolEvent = Symbol("symbol event");
		var emitFn = events.emit;
		var onFnBound = events.on.bind(events);
		var AC1 = new AbortController();
		var AC2 = new AbortController();
		var AC3 = new AbortController();
		var AC4 = new AbortController();
		var AS1 = AC1.signal;
		var AS2 = AC2.signal;
		var AS3 = AC3.signal;
		var AS4 = AC4.signal;

		results.push( onFnBound("test",A) );
		results.push( onFnBound("test",A) );
		results.push( events.once("test",B) );
		results.push( events.once("test",B) );
		results.push( emitFn.call(events,"test",counter++) );
		results.push( emitFn.call(events,"test",counter++) );
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
		results.push( events2.once("test",A2) );
		results.push( events2.emit("test",counter++) );
		results.push( events2.off("test",A2) );
		results.push( events3.once("test",A3) );
		results.push( events3.customEmit("test",counter++) );
		results.push( events3.off("test",A3) );

		results.push( events.on("test",A,{ signal: AS1, }) );
		results.push( events.emit("test",counter++) );
		AC1.abort("unsubscribe-1");
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",A) );
		results.push( events.on("test",A,{ signal: AS1, }) );
		results.push( events.once("test",A,{ signal: AS2, }) );
		AC2.abort("unsubscribe-2");
		results.push( events.emit("test",counter++) );
		results.push( events.off("test",A) );

		results.push( events.on("test-2",A,{ signal: AS3, }) );
		results.push( events.on("test-3",A,{ signal: AS3, }) );
		results.push( events.on("test-4",A,{ signal: AS4, }) );
		results.push( events.emit("test-2",counter++) );
		results.push( events.emit("test-3",counter++) );
		results.push( events.emit("test-4",counter++) );
		AC3.abort("unsubscribe-3");
		results.push( events.emit("test-2",counter++) );
		results.push( events.emit("test-3",counter++) );
		results.push( events.emit("test-4",counter++) );
		results.push( events.off("test-2",A) );
		results.push( events.off("test-3",A) );
		AC4.abort("unsubscribe-4");
		results.push( events.emit("test-4",counter++) );
		results.push( events.off("test-4",A) );

		if (JSON.stringify(results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Sync Tests) PASSED.";
			return true;
		}
		else {
			testResultsEl.innerHTML += "(Sync Tests) FAILED.<br><br>";
			reportExpectedActual(expected,results);
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML += "(Sync Tests) FAILED -- see console.";
	}
	return false;


	// ***********************

	function A(msg) {
		results.push(`A: ${msg} (${this === events})`);
	}

	function A2(msg) {
		results.push(`A2: ${msg} (${this === events2})`);
	}

	function A3(msg) {
		results.push(`A3: ${msg} (${this === events3})`);
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
			testResultsEl.innerHTML += "(Async Tests) PASSED.";
			return true;
		}
		else {
			testResultsEl.innerHTML += "(Async Tests) FAILED.<br><br>";
			reportExpectedActual(expected,results);
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML += "(Async Tests) FAILED -- see console.";
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
	cleanupWeakTestsButtons();

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
		E(msg) {
			weakTests.results.push(`E: ${msg}`);
		},
	};
	var EController1 = new AbortController();
	var ESignal1 = EController1.signal;
	var EController2 = new AbortController();
	var ESignal2 = EController2.signal;
	weakTests.events1 = new Eventer({ asyncEmit: false, weakListeners: true, });
	weakTests.events2 = new Eventer({ asyncEmit: false, weakListeners: false, });
	weakTests.events3 = new Eventer({ asyncEmit: false, weakListeners: false, });
	weakTests.finalization = new FinalizationRegistry(
		(val) => weakTests.results.push(`removed: ${val}`)
	);
	weakTests.finalization.register(weakTests.listeners.A,"A");
	weakTests.finalization.register(weakTests.listeners.B,"B");
	weakTests.finalization.register(weakTests.listeners.C,"C");
	weakTests.finalization.register(weakTests.listeners.D,"D");
	weakTests.finalization.register(weakTests.events3,"events3");
	weakTests.finalization.register(ESignal1,"E.signal.1");
	weakTests.finalization.register(ESignal2,"E.signal.2");

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

		weakTests.events1.on("test-4",weakTests.listeners.E,{ signal: ESignal1, });
		weakTests.events1.on("test-5",weakTests.listeners.E,{ signal: ESignal1, });
		weakTests.events1.on("test-6",weakTests.listeners.E,{ signal: ESignal2, });

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
			weakTests.EController1 = EController1;
			weakTests.EController2 = EController2;
			weakTests.ESignal1 = ESignal1;
			weakTests.ESignal2 = ESignal2;

			testResultsEl.innerHTML += `
				<br><strong>NEXT: Please trigger a GC event in the browser</strong> before running the <em>part 2</em> tests.
				<br>
				<small>(see instructions above for Chrome or Firefox browsers)</small>
				<br>
				<button type="button" id="run-weak-tests-part-2-btn">next (part 2) -&gt;</button>
				<br><br>
			`;

			document.getElementById("run-weak-tests-part-2-btn").addEventListener("click",runWeakTestsPart2);
			return true;
		}
		else {
			testResultsEl.innerHTML += "(Weak Tests Part 1) FAILED.<br><br>";
			reportExpectedActual(expected,weakTests.results);
			weakTests = {};
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Weak Tests Part 1) FAILED -- see console.";
		weakTests = {};
	}
	return false;
}

async function runWeakTestsPart2() {
	testResultsEl.innerHTML += "Running weak tests (part 2)...<br>";
	var expected = [
		"removed: A",
		"removed: B",
		"removed: C",
		"removed: D",
		"removed: events3",
		false,
		false,
		false,
		false,
	];

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

			weakTests.results.length = 0;
			// allow GC of abort-controllers/signals (for part 3)
			weakTests.EController1 = weakTests.ESignal1 =
				weakTests.EController2 = weakTests.ESignal2 = null;


			testResultsEl.innerHTML += `
				<br><strong>LASTLY: Please trigger *ONE MORE* GC event in the browser</strong> before running the <em>part 3</em> tests.
				<br>
				<small>(see instructions above for Chrome or Firefox browsers)</small>
				<br>
				<button type="button" id="run-weak-tests-part-3-btn">next (part 3) -&gt;</button>
				<br><br>
			`;

			document.getElementById("run-weak-tests-part-3-btn").addEventListener("click",runWeakTestsPart3);
			return true;
		}
		else {
			testResultsEl.innerHTML += "(Weak Tests Part 2) FAILED.<br><br>";
			reportExpectedActual(expected,weakTests.results);
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Weak Tests Part 2) FAILED -- see console.";
	}
	finally {
		cleanupWeakTestsButtons(true,false);
	}
	return false;
}

async function runWeakTestsPart3() {
	testResultsEl.innerHTML += "Running weak tests (part 3)...<br>";
	var expected = [
		"removed: E.signal.1",
		"removed: E.signal.2",
	];
	weakTests.finalization = null;

	try {
		// normalize unpredictable finalization-event ordering
		weakTests.results.sort((v1,v2) => (
			typeof v1 == "string" ? (
				typeof v2 == "string" ? v1.localeCompare(v2) : 0
			) : 1
		));

		if (JSON.stringify(weakTests.results) == JSON.stringify(expected)) {
			testResultsEl.innerHTML += "(Weak Tests Part 3) PASSED.<br>";
			return true;
		}
		else {
			testResultsEl.innerHTML += "(Weak Tests Part 3) FAILED.<br><br>";
			reportExpectedActual(expected,weakTests.results);
		}
	}
	catch (err) {
		logError(err);
		testResultsEl.innerHTML = "(Weak Tests Part 3) FAILED -- see console.";
	}
	finally {
		cleanupWeakTestsButtons();
		weakTests = {};
	}
	return false;
}

function cleanupWeakTestsButtons(part2 = true,part3 = true) {
	if (part2) {
		let btn1 = document.getElementById("run-weak-tests-part-2-btn");
		if (btn1 != null) {
			btn1.disabled = true;
			btn1.removeEventListener("click",runWeakTestsPart2);
		}
	}
	if (part3) {
		let btn2 = document.getElementById("run-weak-tests-part-3-btn");
		if (btn2 != null) {
			btn2.disabled = true;
			btn2.removeEventListener("click",runWeakTestsPart3);
		}
	}
}

function timeout(ms) {
	return new Promise(res => setTimeout(res,ms));
}

function reportExpectedActual(expected,results) {
	var expectedStr = expected.join();
	var resultsStr = results.join();
	var matchStr = findLeadingSimilarity(expectedStr,resultsStr);
	if (matchStr != "") {
		expectedStr = `<small><em>${matchStr}</em></small><strong>${expectedStr.slice(matchStr.length)}</strong>`;
		resultsStr = `<small><em>${matchStr}</em></small><strong>${resultsStr.slice(matchStr.length)}</strong>`;
	}
	testResultsEl.innerHTML += `<strong style="text-decoration:underline;">EXPECTED</strong><pre style="white-space:pre-wrap;">${expectedStr}</pre><br><strong style="text-decoration:underline;">ACTUAL</strong><pre style="white-space:pre-wrap;">${resultsStr}</pre>`;
}

function findLeadingSimilarity(str1,str2) {
	for (let i = 0; i < str1.length && i < str2.length; i++) {
		if (str1[i] != str2[i]) {
			return str1.substr(0,i);
		}
	}
	return (
		str1.length < str2.length ? str1 : str2
	);
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
