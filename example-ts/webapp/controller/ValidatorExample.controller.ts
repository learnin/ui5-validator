import CheckBox from "sap/m/CheckBox";
import DatePicker from "sap/m/DatePicker";
import HBox from "sap/m/HBox";
import Input from "sap/m/Input";
import RadioButtonGroup from "sap/m/RadioButtonGroup";
import Control from "sap/ui/core/Control";
import Element from "sap/ui/core/Element";
import JSONModel from "sap/ui/model/json/JSONModel";
import Column from "sap/ui/table/Column";
import Table from "sap/ui/table/Table";
import BaseController from "./BaseController";
import Validator from "learnin/ui5/validator/Validator";

/**
 * @namespace learnin.ui5.validator.example.controller
 */
export default class ValidatorExample extends BaseController {

	private _validator: Validator | undefined;

	onInit() {
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
			requiredInput: null
		}), "withUI5Validator");
		this.setModel(new JSONModel({
			data: [{
				requiredInputStringLabel: "",
				requiredInputLabel: ""
			}, {
				requiredInputStringLabel: "1",
				requiredInputLabel: "1"
			}, {
				requiredInputStringLabel: "2",
				requiredInputLabel: "2"
			}, {
				requiredInputStringLabel: "3",
				requiredInputLabel: "3"
			}, {
				requiredInputStringLabel: "4",
				requiredInputLabel: "4"
			}, {
				requiredInputStringLabel: "5",
				requiredInputLabel: "5"
			}, {
				requiredInputStringLabel: "6",
				requiredInputLabel: "6"
			}, {
				requiredInputStringLabel: "7",
				requiredInputLabel: "7"
			}, {
				requiredInputStringLabel: "8",
				requiredInputLabel: "8"
			}, {
				requiredInputStringLabel: "9",
				requiredInputLabel: "9"
			}, {
				requiredInputStringLabel: "10",
				requiredInputLabel: "10"
			}, {
				requiredInputStringLabel: "11",
				requiredInputLabel: "11"
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
	}
	onExit() {
		const oView = this.getView();
		if (oView !== undefined) {
			this._validator?.removeAttachedValidators(oView);
		}
	}
	onAfterRendering() {
		const oView = this.getView();
		if (!oView || !this._validator) {
			return;
		}

		const validator = this._validator;
		const byId = <T extends Element>(id: string) => oView.byId(id) as T;
		const getText = (key: string, ...args: string[]) => {
			const text = this.getResourceText(key, ...args);
			return typeof text === "string" ? text : "";
		};

		const requiredCheckBoxCustom = byId<HBox>("requiredCheckBoxCustom");
		const requiredCheckBoxCustomItems = requiredCheckBoxCustom.getItems() as CheckBox[];
		validator.registerRequiredValidator(
			(aCheckBoxes: CheckBox[]) => aCheckBoxes.some((oCheckBox) => oCheckBox.getSelected()),
			requiredCheckBoxCustomItems,
			requiredCheckBoxCustom,
			{
				isAttachValidator: true,
				isAttachFocusoutValidationImmediately: false,
				isGroupedTargetControls: true
			}
		);

		const requiredCheckBoxCustom1to3 = byId<HBox>("requiredCheckBoxCustom1to3");
		const requiredCheckBoxCustom1to3Items = requiredCheckBoxCustom1to3.getItems() as CheckBox[];
		validator.registerValidator(
			(aCheckBoxes: CheckBox[]) => {
				const selectedCheckBoxes = aCheckBoxes.filter((oCheckBox) => oCheckBox.getSelected());
				return 1 <= selectedCheckBoxes.length && selectedCheckBoxes.length <= 3;
			},
			getText("message.selectNToN", getText("word.one"), getText("word.three")),
			requiredCheckBoxCustom1to3Items,
			requiredCheckBoxCustom1to3,
			{
				isAttachValidator: true,
				isAttachFocusoutValidationImmediately: false,
				isGroupedTargetControls: true
			}
		);

		// 必須入力チェック以外のバリデーションは、UI5標準バリデーションと同様にフォーカスアウト時にエラー表示させる。
		const fromDate = byId<DatePicker>("fromDate");
		const toDate = byId<DatePicker>("toDate");
		validator.registerValidator(
			([oFromDate, oToDate]: [DatePicker, DatePicker]) => {
				const dFromDateValue = oFromDate.getDateValue() as Date | null;
				const dToDateValue = oToDate.getDateValue() as Date | null;
				// 必須チェックは別でやっているのでここでエラーにするのは両方入力されていて値が不正な場合のみ
				return !(dFromDateValue && dToDateValue && dFromDateValue.getTime() > dToDateValue.getTime());
			},
			[
				getText("message.dateBeforeDate", getText("label.startDate"), getText("label.endDate")),
				getText("message.dateAfterDate", getText("label.endDate"), getText("label.startDate"))
			],	// "From date と To date の大小関係を正しく入力してください" も可能
			[fromDate, toDate],
			toDate
		);

		const correlationRequiredRadioGroup = byId<RadioButtonGroup>("correlationRequiredRadioGroup");
		const correlationRequiredRadioGroup3Input = byId<Input>("correlationRequiredRadioGroup3Input");
		validator.registerRequiredValidator(
			(oInput: Input) => correlationRequiredRadioGroup.getSelectedIndex() !== 2 || !!oInput.getValue(),
			correlationRequiredRadioGroup3Input,
			correlationRequiredRadioGroup3Input,
			{
				isAttachValidator: true,
				isAttachFocusoutValidationImmediately: false,
				isGroupedTargetControls: false,
				controlsMoreAttachValidator: correlationRequiredRadioGroup
			}
		);

		// テーブル内の単項目バリデーション
		const gridTable = byId<Table>("gridTable");
		const col1InGridTable = byId<Column>("col1InGridTable");
		const col3InGridTable = byId<Column>("col3InGridTable");
		const col1InGridTableAsControl = col1InGridTable as unknown as Control;
		const col3InGridTableAsControl = col3InGridTable as unknown as Control;
		validator.registerValidator(
			// この引数の関数は、oInputOrValue には
			// フォーカスアウト時は フォーカスアウトした行の　col3InGridTable が渡されて、1度だけ呼び出され、
			// validate メソッド実行時は n行目のcol3InGridTable列の値 が渡されて、 n = 1 から テーブルにバインドされているデータの行数分まで 繰り返し呼び出される。
			(oInputOrValue: Input | string) => {
				const sValue = oInputOrValue instanceof Input ? oInputOrValue.getValue() : oInputOrValue;
				return !sValue || sValue.length <= 2;
			},
			getText("message.enterUpToLetters", "2"),
			col3InGridTableAsControl,	// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Column を渡す
			gridTable	// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Table を渡す
		);
		
		// テーブル内の同一項目内の相関バリデーション
		validator.registerValidator(
			// この引数の関数は、aInputsOrValues には
			// フォーカスアウト時も validate メソッド実行時も [1行目のcol3InGridTable列の値, 2行目のcol3InGridTable列の値, ... テーブルにバインドされているデータの行末目のcol3InGridTable列の値] が渡されて、1度だけ呼び出される。
			(aInputsOrValues: Array<Input | string>) => {
				const aValues = aInputsOrValues.map((oInputOrValue) =>
					oInputOrValue instanceof Input ? oInputOrValue.getValue() : oInputOrValue
				);
				return aValues.some((sValue) => sValue === "0");
			},
			getText("message.enterEitherLine", "0"),
			col3InGridTableAsControl,	// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Column を渡す
			gridTable,		// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Table を渡す
			{
				isAttachValidator: true,
				isGroupedTargetControls: true,
				isAttachFocusoutValidationImmediately: false
			}
		);

		// テーブル内の同一行内の項目相関バリデーション
		validator.registerValidator(
			// この引数の関数は、aInputsOrValues には
			// フォーカスアウト時は フォーカスアウトした行の　[col1InGridTable, col3InGridTable] が渡されて、1度だけ呼び出され、
			// validate メソッド実行時は [n行目のcol1InGridTable列の値, n行目のcol3InGridTable列の値] が渡されて、 n = 1 から テーブルにバインドされているデータの行数分まで 繰り返し呼び出される。
			(aInputsOrValues: Array<Input | string>) => {
				const aValues = aInputsOrValues.map((oInputOrValue) =>
					oInputOrValue instanceof Input ? oInputOrValue.getValue() : oInputOrValue
				);
				const col1Value = aValues[0] ?? "";
				const col3Value = aValues[1] ?? "";
				return !(col1Value === "0" && col3Value.length > 1);
			},
			getText("message.col1AndCol3InGridTableValidationError", "Not required Input string label in GridTable", "0", "Required Input Label in GridTable", "1"),
			[col1InGridTableAsControl, col3InGridTableAsControl],	// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Column を渡す
			gridTable		// sap.ui.table.Table 内のコントロールをバリデーションする場合、ここは sap.ui.table.Table を渡す
		);
	}
	onShowErrors() {
		this.showValidationErrorMessageDialog();
	}
	onValidate() {
		const oView = this.getView();
		if (!oView || !this._validator) {
			return;
		}
		const viewAsControl = oView as unknown as Control;

		this._validator.removeErrors(viewAsControl);
		this.removeAllTechnicalMessages();

		if (!this._validator.validate(viewAsControl, {isDoConstraintsValidation: true}) || this.hasErrorMessages()) {
			this.showValidationErrorMessageDialog();
			return;
		}
	}
	onClearErrors() {
		const oView = this.getView();
		if (!oView || !this._validator) {
			return;
		}
		const viewAsControl = oView as unknown as Control;
		this._validator.removeErrors(viewAsControl);
		sap.ui.getCore().getMessageManager().removeAllMessages();
	}
}
