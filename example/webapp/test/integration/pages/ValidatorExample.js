sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/core/ValueState"
], function (
	Opa5,
	Press,
	ValueState) {
	"use strict";

	const sViewName = "ValidatorExample";

	Opa5.createPageObjects({
		onTheValidatorExamplePage: {
			actions: {
				pressValidateButton: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						matchers: {
							properties: {text: "Validate"}
						},
						viewName: sViewName,
						actions: new Press()
					});
				},
				teardown: function() {
					return this.waitFor({
						controlType: "sap.m.Button",
						matchers: {
							properties: {text: "label.cancel"}
						},
						searchOpenDialogs: true,
						actions: new Press()
					});
				}
			},
			assertions: {
				inputControlShouldError: function () {
					return this.waitFor({
						controlType: "sap.m.Input",
						viewName: sViewName,
						visible: false, // ダイアログで操作不能なビューを検索対象に含めるために必要
						success: function (aInputs) {
							Opa5.assert.ok(aInputs[0].getValueState() === ValueState.Error, "InputのValueStateがエラーになる");
						}
					});
				}
			}
		}
	});
});
