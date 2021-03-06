sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"./BaseController",
	"learnin/ui5/validator/Validator"
], function (JSONModel, BaseController, Validator) {
	"use strict";

	return BaseController.extend("learnin.ui5.validator.example.controller.ValidatorExample", {
		onInit: function () {
			this.setModel(new JSONModel({
				requiredLabelInput: "",
				requiredInput: "",
				requiredMaskInput: undefined,
				requiredSelect: [{
					value: "",
					text: ""
				}, {
					value: "value1",
					text: "text1"
				}],
				selectedKeyOfRequiredSelect: "",
				requiredRadio1: "text1",
				selectedOfRequiredRadio1: false,
				requiredRadioGroup1: "text1",
				requiredRadioGroup2: "text2",
				selectedIndexOfRequiredRadioGroup: -1,
				selectedOfRequiredCheckBox: false,
				requiredCheckBoxWithValue: [{
					value: "value1",
					text: "text1"
				}, {
					value: "value2",
					text: "text2"
				}],
				requiredDatePicker: null,
				requiredTimePicker: null,
				requiredComboBox: [{
					value: "value1",
					text: "text1"
				}, {
					value: "value2",
					text: "text2"
				}],
				selectedKeyOfRequiredComboBox: "",
				requiredMultiComboBox: [{
					value: "value1",
					text: "text1"
				}, {
					value: "value2",
					text: "text2"
				}],
				selectedKeyOfRequiredMultiComboBox: [],
				requiredTextArea: "",
				requiredFileUploader: "",
				requiredRatingIndicator: 0,
				requiredSearchField: ""
			}), "inForm");
			this.setModel(new JSONModel({
				requiredInput: "",
				requiredCalendar: [{
					startDate: null
				}],
				requiredCalendarDateInterval: [{
					startDate: null
				}]
			}), "outForm");
			this.setModel(new JSONModel({
				requiredInput: ""
			}), "withUI5Validator");
			this.setModel(new JSONModel({
				rows: [{
					requiredInputStringLabel: "",
					requiredInputLabel: ""
				}, {
					requiredInputStringLabel: "",
					requiredInputLabel: ""
				}]
			}), "inGridTable");
			this.setModel(new JSONModel({
				items: [{
					requiredInput: "",
					requiredInput2: ""
				}, {
					requiredInput: "",
					requiredInput2: ""
				}]
			}), "inResponsiveTable");
			this.setModel(new JSONModel({
				requiredCheckBox: [{
					text: "text1"
				}, {
					text: "text2"
				}],
				requiredCheckBox1to3: [{
					text: "text1"
				}, {
					text: "text2"
				}, {
					text: "text3"
				}, {
					text: "text4"
				}]
			}), "custom");
			this.setModel(new JSONModel({
				fromDate: null,
				toDate: null,
				requiredRadioGroup1: "text1",
				requiredRadioGroup2: "text2",
				requiredRadioGroup3: "other",
				selectedIndexOfRequiredRadioGroup: -1,
				requiredRadioGroup3Input: ""
			}), "correlation");

			this._validator = new Validator();
			// this._validator = new Validator({useFocusoutValidation: false});
		},
		onExit: function () {
			this._validator.removeAttachedValidators(this.getView());
		},
		onAfterRendering: function () {
			const oView = this.getView();

			this._validator.registerRequiredValidator(
				(aCheckBoxes) => aCheckBoxes.some(oCheckBox => oCheckBox.getSelected()),
				oView.byId("requiredCheckBoxCustom").getItems(),
				oView.byId("requiredCheckBoxCustom"),
				{
					isGroupedTargetControls: true
				}
			);

			this._validator.registerValidator(
				(aCheckBoxes) => {
					const selectedCheckBoxes = aCheckBoxes.filter(oCheckBox => oCheckBox.getSelected());
					return 1 <= selectedCheckBoxes.length && selectedCheckBoxes.length <=3;
				},
				this.getResourceText("message.selectNToN", this.getResourceText("word.one"), this.getResourceText("word.three")),
				oView.byId("requiredCheckBoxCustom1to3").getItems(),
				oView.byId("requiredCheckBoxCustom1to3"),
				{
					isAttachFocusoutValidationImmediately: false,
					isGroupedTargetControls: true
				}
			);

			// ????????????????????????????????????????????????????????????UI5????????????????????????????????????????????????????????????????????????????????????????????????
			this._validator.registerValidator(
				([oFromDate, oToDate]) => {
					const dFromDateValue = oFromDate.getDateValue();
					const dToDateValue = oToDate.getDateValue();
					// ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
					return !(dFromDateValue && dToDateValue && dFromDateValue.getTime() > dToDateValue.getTime());
				},
				[
					this.getResourceText("message.dateBeforeDate", this.getResourceText("label.startDate"), this.getResourceText("label.endDate")),
					this.getResourceText("message.dateAfterDate", this.getResourceText("label.endDate"), this.getResourceText("label.startDate"))
				],	// "From date ??? To dare ???????????????????????????????????????????????????" ?????????
				[oView.byId("fromDate"), oView.byId("toDate")],
				oView.byId("toDate")
			);

			this._validator.registerRequiredValidator(
				(oInput) => oView.byId("correlationRequiredRadioGroup").getSelectedIndex() !== 2 || oInput.getValue(),
				oView.byId("correlationRequiredRadioGroup3Input"),
				oView.byId("correlationRequiredRadioGroup3Input"),
				{
					controlsMoreAttachValidator: oView.byId("correlationRequiredRadioGroup")
				}
			);
		},
		onValidate: function () {
			const oView = this.getView();

			this._validator.removeErrors(oView);
			this.removeAllTechnicalMessages();

			if (!this._validator.validate(oView) || this.hasErrorMessages()) {
				this.showValidationErrorMessageDialog();
				return;
			}
		},
		onClearErrors: function () {
			this._validator.removeErrors(this.getView());
			sap.ui.getCore().getMessageManager().removeAllMessages();
		}
	});
});
