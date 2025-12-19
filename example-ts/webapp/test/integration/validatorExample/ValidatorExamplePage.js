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
		onPage: {
			actions: {
				検証ボタンを押下する: function () {
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
				visibleでrequiredな未入力の入力コントロールのValueStateがエラーになる: function () {
					return this.waitFor({
						controlType: "sap.m.Input",
						viewName: sViewName,
						visible: false, // ダイアログで操作不能なビューを検索対象に含めるために必要
						success: function (aInputs) {
							Opa5.assert.ok(aInputs
								.filter(oInput => !oInput.getId().startsWith("__component0---app--notRequiredInputStringLabelInGridTable")
									&& !oInput.getId().startsWith("__component0---app--requiredInputLabelInGridTable")
									&& oInput.getId() !== "__component0---app--InvisibleInputStringLabelInGridTable"
									&& oInput.getId() !== "__component0---app--correlationRequiredRadioGroup3Input")
								.every(oInput => oInput.getValueState() === ValueState.Error),
								"スクロールのあるテーブル内にあるものを除くすべてのvisibleでrequiredな未入力のInputのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.Select",
						viewName: sViewName,
						visible: false,
						matchers: {
							properties: {required: true}
						},
						success: function (aSelects) {
							Opa5.assert.ok(aSelects
								.every(oSelect => oSelect.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のSelectのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.RadioButton",
						viewName: sViewName,
						visible: false,
						success: function (aRadioButtons) {
							Opa5.assert.ok(aRadioButtons
								.every(oRadioButton => oRadioButton.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のRadioButtonのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.CheckBox",
						viewName: sViewName,
						visible: false,
						success: function (aCheckBoxes) {
							Opa5.assert.ok(aCheckBoxes
								.every(oCheckBox => oCheckBox.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のCheckBoxのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.DatePicker",
						viewName: sViewName,
						visible: false,
						success: function (aDatePickers) {
							Opa5.assert.ok(aDatePickers
								.every(oDatePicker => oDatePicker.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未入力のDatePickerのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.TimePicker",
						viewName: sViewName,
						visible: false,
						success: function (aTimePickers) {
							Opa5.assert.ok(aTimePickers
								.every(oTimePicker => oTimePicker.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未入力のTimePickerのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.ComboBox",
						viewName: sViewName,
						visible: false,
						success: function (aComboBoxs) {
							Opa5.assert.ok(aComboBoxs
								.every(oComboBox => oComboBox.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のComboBoxのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.MultiComboBox",
						viewName: sViewName,
						visible: false,
						success: function (aMultiComboBoxs) {
							Opa5.assert.ok(aMultiComboBoxs
								.every(oMultiComboBox => oMultiComboBox.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のMultiComboBoxのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.m.TextArea",
						viewName: sViewName,
						visible: false,
						success: function (aTextAreas) {
							Opa5.assert.ok(aTextAreas
								.every(oTextArea => oTextArea.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未入力のTextAreaのValueStateがエラーになる");
						}
					}).waitFor({
						controlType: "sap.ui.unified.FileUploader",
						viewName: sViewName,
						visible: false,
						success: function (aFileUploaders) {
							Opa5.assert.ok(aFileUploaders
								.every(oFileUploader => oFileUploader.getValueState() === ValueState.Error),
								"すべてのvisibleでrequiredな未選択のFileUploaderのValueStateがエラーになる");
						}
					});
				}
			}
		}
	});
});
