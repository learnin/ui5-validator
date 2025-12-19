/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./ValidatorExamplePage"
], function (opaTest) {
	"use strict";

	QUnit.module("ValidatorExample");

	opaTest("未入力で検証ボタンを実行した場合_visibleでrequiredな未入力の入力コントロールのValueStateがエラーになる", function (Given, When, Then) {
		// これは最初のケースだけに書く
		Given.startApp();

		When.onPage.検証ボタンを押下する();

		Then.onPage.visibleでrequiredな未入力の入力コントロールのValueStateがエラーになる();

		When.onPage.teardown();
		// これは最後のケースだけに書く
		Then.iTeardownMyApp();
	});
});
