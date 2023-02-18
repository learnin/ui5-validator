/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/ValidatorExample"
], function (opaTest) {
	"use strict";

	QUnit.module("ValidatorExample");

	opaTest("未入力で検証ボタンを実行した場合", function (Given, When, Then) {
		// これは最初のケースだけに書く
		Given.startApp();

		When.onTheValidatorExamplePage.pressValidateButton();

		Then.onTheValidatorExamplePage.inputControlShouldError();

		When.onTheValidatorExamplePage.teardown();
		// これは最後のケースだけに書く
		Then.iTeardownMyApp();
	});
});
