sap.ui.define([
	"sap/ui/test/Opa5",
	"./arrangements/Startup",
	"./validatorExample/ValidatorExampleTest"
], function (Opa5, Startup) {
	"use strict";

	Opa5.extendConfig({
		arrangements: new Startup(),
		viewNamespace: "learnin.ui5.validator.example.view.",
		autoWait: true,
		timeout: 5
	});
});
