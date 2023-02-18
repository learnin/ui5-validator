/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"learnin/ui5/validator/example/test/integration/AllTests"
	], function() {
		QUnit.start();
	});
});
