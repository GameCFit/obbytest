class PrototypeWrapper {

	constructor(readyCallback) {
		// Wrapper initialization.
		console.log("Wrapper initialization started.");
		readyCallback();
	}

}

function initializeWrapper() {
	if (typeof window !== 'undefined') {
		window.prototypeWrapper = new PrototypeWrapper(() => {
			// Application initialization on wrapper ready callback.
			application.initialize();
		});
	}
}