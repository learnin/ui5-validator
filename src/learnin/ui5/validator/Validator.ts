import deepExtend from "sap/base/util/deepExtend";
import uid from "sap/base/util/uid";
import CheckBox from "sap/m/CheckBox";
import ColumnListItem from "sap/m/ColumnListItem";
import IconTabFilter from "sap/m/IconTabFilter";
import Input from "sap/m/Input";
import BaseObject from "sap/ui/base/Object";
import Control from "sap/ui/core/Control";
import Element, { registry as ElementRegistry } from "sap/ui/core/Element";
import LabelEnablement from "sap/ui/core/LabelEnablement";
import { MessageType, ValueState } from "sap/ui/core/library";
import ControlMessageProcessor from "sap/ui/core/message/ControlMessageProcessor";
import Message from "sap/ui/core/message/Message";
import JSONModel from "sap/ui/model/json/JSONModel";
import FormContainer from "sap/ui/layout/form/FormContainer";
import FormElement from "sap/ui/layout/form/FormElement";
import Column from "sap/ui/table/Column";
import Row from "sap/ui/table/Row";
import Table from "sap/ui/table/Table";
import ListBinding from "sap/ui/model/ListBinding";
import ManagedObject from "sap/ui/base/ManagedObject";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Event from "sap/ui/base/Event";

// ui5-tooling-transpile が `import { default as sapMTable } from "sap/m/Table";` のようなデフォルトエクスポートのインポートへの別名付けの変換に対応していないため
// デフォルトエクスポートクラス名が重複するものは別モジュールでインポートして対応している。
import SapMTableUtil from "./SapMTableUtil";

// 検証対象のコントロールもしくはそれを含むコンテナ
type ValidateTargetControlOrContainer = Control | FormContainer | FormElement| IconTabFilter;

type OptionParameterOfRegisterValidator = {
	isAttachValidator: boolean,
	isAttachFocusoutValidationImmediately: boolean,
	isGroupedTargetControls: boolean,
	controlsMoreAttachValidator: Control | Control[]
};

/**
 * スクロールイベントハンドラ等、頻繁に実行されるイベントを間引くためのラッパー
 * 
 * @param {Object} thisArg this 参照
 * @param {function} fn イベントハンドラ
 * @param {int} delay 遅延ミリ秒。最後に発生したイベントからこの期間を経過すると実行される
 * @returns {function} イベントハンドラ
 */
const debounceEventHandler = (thisArg, fn, delay) => {
	let timeoutId;

	return (oEvent) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		// https://sapui5.hana.ondemand.com/#/api/sap.ui.base.Event
		// > Implements sap.ui.base.Poolable and therefore an event object in the event handler will be reset by sap.ui.base.ObjectPool after the event handler is done.
		// 上記の通り、Event はハンドラ関数が終わるとリセットされてしまうので、非同期で実行可能とするためにディープコピーする。
		const oClonedEvent = deepExtend({}, oEvent);
		timeoutId = setTimeout(() => fn.call(thisArg, oClonedEvent), delay);
	};
};

/**
 * バリデータ。
 * SAPUI5 の標準のバリデーションの仕組みは基本的にフォームフィールドの change 等のイベントで実行されるため
 * 必須フィールドに未入力のまま保存ボタン等を押された時にはバリデーションが実行されない。
 * 本バリデータはそれに対応するためのもので、必須フィールドのバリデーションや相関バリデーション等の独自バリデーションを行うための機能を提供する。
 * 
 * @namespace learnin.ui5.validator
 */
export default class Validator extends BaseObject {

	/**
	 * 入力コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
	 */
	public RESOURCE_BUNDLE_KEY_REQUIRED_INPUT = "learnin.ui5.validator.Validator.message.requiredInput";
	
	/**
	 * 選択コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
	 */
	public RESOURCE_BUNDLE_KEY_REQUIRED_SELECT = "learnin.ui5.validator.Validator.message.requiredSelect";
	
	/**
	 * バリデーションエラーにより ValueState.Error をセットされたコントロールに付加する customData 属性のキー
	 */
	private _CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR = "learnin.ui5.validator.Validator.IS_SET_VALUE_STATE_ERROR";
	
	// バリデーション対象とするコントロールの aggregation 名
	private _aTargetAggregations = [
		"items",
		"content",
		"form",
		"formContainers",
		"formElements",
		"fields",
		"sections",
		"subSections",
		"app",
		"pages",
		"_grid",
		"_page",
		"cells"		// sap.m.Table -> items -> cells
	];
	
	private _mRegisteredValidator;
	
	private _mControlIdAttachedValidator;
	
	// sap.ui.table.Table にバインドされているデータで、バリデーションエラーとなったデータの行・列情報を保持するマップ。型は Map<string, Object[]>
	// key: テーブルID,
	// value: {
	//   rowPath: {string} sap.ui.table.Rowのバインディングパス,
	//   rowIndex: {number} 行インデックス,
	//   columnId: {string} 列ID,
	//   message: {string} エラーメッセージ,
	//   validateFunctionId: {string} registerValidator/registerRequiredValidatorで登録されたバリデータID or ""(デフォルトの必須バリデータの場合)
	// }
	private _mInvalidTableRowCols: Map<string, {
		rowPath: string,
		rowIndex: number,
		columnId: string,
		message: string,
		validateFunctionId: string
	}[]> = new Map();
	
	private _sTableIdAttachedRowsUpdated;
	
	private _fnDebouncedRenewValueStateInTable;
	
	private _resourceBundle;
	
	private _useFocusoutValidation;

	/**
	 * コンストラクタのオプションパラメータ
	 * 
	 * @typedef {Object} Validator~Parameter
	 * @property {ResourceBundle} resourceBundle i18n リソースバンドルクラス
	 * @property {string|string[]} targetAggregations バリデーション対象として追加する、コントロールの aggregation 名
	 * @property {boolean} useFocusoutValidation validate メソッド実行時に isRequired が true のコントロールおよび、registerValidator, registerRequiredValidator の対象コントロールに
	 * 		フォーカスアウト時のバリデーション関数を attach するか。
	 * 		挙動としては以下のいずれかとなる。
	 * 		true （デフォルト）の場合：1度 validate するとフォーカスアウトでバリデーションが効くようになる（正しい値を入れてフォーカスアウトしてエラーが消えてもまた不正にしてフォーカスアウトするとエラーになる）
	 * 		false の場合：1度 validate すると removeErrors するまでエラーは残りっぱなしとなる
	 * 		ただし、registerValidator, registerRequiredValidator が isAttachFocusoutValidationImmediately: true で実行された場合にはそのバリデーション関数は
	 * 		useFocusoutValidation の値には関係なく attach される。
	 */
	/**
	 * @constructor
	 * @public
	 * @param {Validator~Parameter} [mParameter] パラメータ
	 */
	constructor(mParameter?: {
		resourceBundle: ResourceBundle,
		targetAggregations: string | string[],
		useFocusoutValidation: boolean
	}) {
		super();

		// {@link #registerValidator registerValidator} {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数情報オブジェクト配列を保持するマップ。
		// 型は Map<string, Object[]>
		this._mRegisteredValidator = new Map();

		// フォーカスアウト時のバリデーション関数が attach されたコントロールIDを保持するマップ。型は Map<string, string[]>
		// key: コントロールID,
		// value: validateFunctionIds アタッチされているバリデータ関数のID（デフォルトの必須バリデータの場合は ""）
		this._mControlIdAttachedValidator = new Map();

		// _invalidTableRowCols を使ってスクロール時に配下のコントロールのValueStateの最新化を行うためのイベントハンドラをアタッチした sap.ui.table.Table のIDのセット
		this._sTableIdAttachedRowsUpdated = new Set();

		this._fnDebouncedRenewValueStateInTable = null;

		if (mParameter && mParameter.resourceBundle) {
			this._resourceBundle = mParameter.resourceBundle;
		}

		if (mParameter && mParameter.targetAggregations) {
			if (Array.isArray(mParameter.targetAggregations)) {
				mParameter.targetAggregations.forEach(sTargetAggregation => {
					if (!this._aTargetAggregations.includes(sTargetAggregation)) {
						this._aTargetAggregations.push(sTargetAggregation);
					}
				});
			} else {
				if (!this._aTargetAggregations.includes(mParameter.targetAggregations)) {
					this._aTargetAggregations.push(mParameter.targetAggregations);
				}
			}
		}

		this._useFocusoutValidation = true;
		if (mParameter && mParameter.useFocusoutValidation === false) {
			this._useFocusoutValidation = false;
		}
	}

	/**
	 * 引数のオブジェクトもしくはその配下のコントロールのバリデーションを行う。
	 *
	 * @public
	 * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
	 * @returns {boolean} true: valid, false: invalid
	 */
	validate(oTargetRootControl: ValidateTargetControlOrContainer): boolean {
		if (this._useFocusoutValidation) {
			this._attachValidator(oTargetRootControl);
		}
		return this._validate(oTargetRootControl);
	};

	/**
	 * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより追加されたメッセージを
	 * {@link sap.ui.core.message.MessageManager MessageManager} から除去する。
	 * その結果、該当コントロールにメッセージがなくなった場合は、{@link sap.ui.core.ValueState ValueState} もクリアする。
	 *
	 * @public
	 * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
	 */
	removeErrors(oTargetRootControl: ValidateTargetControlOrContainer): void {
		if (!oTargetRootControl) {
			throw new SyntaxError();
		}
		if (!(oTargetRootControl instanceof Control) &&
			!(oTargetRootControl instanceof FormContainer) &&
			!(oTargetRootControl instanceof FormElement) &&
			!(oTargetRootControl instanceof IconTabFilter)) {
			// バリデート時には isVisible() も条件としているが、remove 時には変わっている可能性もなくはないため、あえて条件に入れない。
			return;
		}
		const oMessageManager = sap.ui.getCore().getMessageManager();
		const oMessageModel = oMessageManager.getMessageModel();
		const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
		const aMessagesAddedByThisValidator = oMessageModel.getProperty("/")
			.filter(oMessage => BaseObject.isA(oMessage, sValidatorMessageName));
		const sTargetRootControlId = oTargetRootControl.getId();

		for (let i = 0, n = aMessagesAddedByThisValidator.length; i < n; i++) {
			const oMessage = aMessagesAddedByThisValidator[i];
			const aControlIds = oMessage.getValidationErrorControlIds();

			if (!aControlIds.some(sControlId => ElementRegistry.get(sControlId))) {
				// 対象のコントロールが1つもない場合はメッセージも削除する。
				oMessageManager.removeMessages(oMessage);
				continue;
			}
			aControlIds.forEach(sControlId => {
				const oControl = ElementRegistry.get(sControlId);
				if (this._isChildOrEqualControlId(oControl, sTargetRootControlId)) {
					oMessageManager.removeMessages(oMessage);
				}
			});
		}

		this._mInvalidTableRowCols.forEach((oRowCol, sTableId) => {
			const oTable = ElementRegistry.get(sTableId);
			if (oTable && this._isChildOrEqualControlId(oTable, sTargetRootControlId)) {
				this._mInvalidTableRowCols.delete(sTableId);
			}
		});

		ElementRegistry.forEach((oElement, sId) => {
			if (this._isSetValueStateError(oElement)) {
				if (this._isChildOrEqualControlId(oElement, sTargetRootControlId)) {
					this._clearValueStateIfNoErrors(oElement, this._resolveMessageTarget(oElement));
				}
			}
		});
	};

	/**
	 * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより attach された関数を detach する。
	 * 
	 * @public
	 * @param {ValidateTargetControlOrContainer} oTargetRootControl 対象のコントロールもしくはそれを含むコンテナ
	 */
	removeAttachedValidators(oTargetRootControl: ValidateTargetControlOrContainer): void {
		if (!oTargetRootControl) {
			throw new SyntaxError();
		}
		if (!(oTargetRootControl instanceof Control) &&
			!(oTargetRootControl instanceof FormContainer) &&
			!(oTargetRootControl instanceof FormElement) &&
			!(oTargetRootControl instanceof IconTabFilter)) {
			return;
		}
		const sTargetRootControlId = oTargetRootControl.getId();

		this._mControlIdAttachedValidator.forEach((aValidateFunctionIds, sControlId) => {
			const oControl = ElementRegistry.get(sControlId);
			if (!oControl) {
				return;
			}
			if (this._isChildOrEqualControlId(oControl, sTargetRootControlId)) {
				this._detachAllValidators(oControl);
			}
		});
		this._sTableIdAttachedRowsUpdated.forEach(sTableId => {
			const oTable = ElementRegistry.get(sTableId);
			if (!oTable || !(oTable instanceof Table)) {
				return;
			}
			if (this._isChildOrEqualControlId(oTable, sTargetRootControlId)) {
				if (this._fnDebouncedRenewValueStateInTable) {
					oTable.detachRowsUpdated(this._fnDebouncedRenewValueStateInTable, this);
				}
				oTable.detachSort(this._clearInValidRowColsInTable, this);
				oTable.detachFilter(this._clearInValidRowColsInTable, this);
				oTable.detachModelContextChange(this._clearInValidRowColsInTable, this);
				this._sTableIdAttachedRowsUpdated.delete(sTableId);
			}
		});
	};

	/**
	 * {@link #registerValidator registerValidator} {@link #registerRequiredValidator registerRequiredValidator} の引数のコールバック関数の型
	 *
	 * @public
	 * @callback testFunction
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oTargetControlOrAControls 検証対象のコントロールまたはその配列
	 * @returns {boolean} true: valid、false: invalid
	 */
	/**
	 * oControlValidateBefore の検証後に実行する関数を登録する。
	 * すでに oControlValidateBefore に sValidateFunctionId の関数が登録されている場合は関数を上書きする。
	 * 
	 * @public
	 * @param {string} [sValidateFunctionId] fnTest を識別するための任意のID。省略時は自動生成される
	 * @param {testFunction} fnTest oControlValidateBefore の検証後に実行される検証用の関数
	 * @param {string|string[]} sMessageTextOrAMessageTexts 検証エラーメッセージまたはその配列
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oTargetControlOrAControls 検証対象のコントロールまたはその配列
	 * @param {sap.ui.core.Control} oControlValidateBefore {@link #validate validate} oControlValidateBefore の検証後に fnTest が実行される。fnTest の実行順を指定するためのもの
	 * @param {Object} [mParameter] オプションパラメータ
	 * @returns {Validator} Reference to this in order to allow method chaining
	 */
	// oTargetControlOrAControls が配列で sMessageTextOrAMessageTexts も配列で要素数が同じはOK
	// oTargetControlOrAControls が配列で sMessageTextOrAMessageTexts がObjectもOK
	// oTargetControlOrAControls がObjectで sMessageTextOrAMessageTexts もObjectもOK
	registerValidator(sValidateFunctionId: string, fnTest: Function, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator
	registerValidator(fnTest: Function, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator
	registerValidator(
		sValidateFunctionIdOrTest: string | Function,
		fnTestOrMessageTextOrAMessageTexts: Function | string | string[],
		sMessageTextOrAMessageTextsOrTargetControlOrAControls: string | string[] | Control | Control[],
		oTargetControlOrAControlsOrControlValidateBefore: Control | Control[],
		oControlValidateBeforeOrParameter: Control | OptionParameterOfRegisterValidator,
		mParameter?: OptionParameterOfRegisterValidator): Validator {
		if (typeof sValidateFunctionIdOrTest === "string") {
			return this._registerValidator(
				false,
				sValidateFunctionIdOrTest,
				fnTestOrMessageTextOrAMessageTexts as Function,
				sMessageTextOrAMessageTextsOrTargetControlOrAControls as string | string[],
				oTargetControlOrAControlsOrControlValidateBefore as Control | Control[],
				oControlValidateBeforeOrParameter as Control,
				mParameter);
		}
		return this._registerValidator(
			true,
			uid(),
			sValidateFunctionIdOrTest,
			fnTestOrMessageTextOrAMessageTexts as string | string[],
			sMessageTextOrAMessageTextsOrTargetControlOrAControls as Control | Control[],
			oTargetControlOrAControlsOrControlValidateBefore as Control,
			oControlValidateBeforeOrParameter as OptionParameterOfRegisterValidator);
	}

	private _registerValidator(
		isOriginalFunctionIdUndefined: boolean,
		sValidateFunctionId: string,
		fnTest: Function,
		sMessageTextOrAMessageTexts: string | string[],
		oTargetControlOrAControls: Control | Control[],
		oControlValidateBefore: Control,
		mParameter?: OptionParameterOfRegisterValidator): Validator {
		if (!(
			(!Array.isArray(oTargetControlOrAControls) && !Array.isArray(sMessageTextOrAMessageTexts)) ||
			(Array.isArray(oTargetControlOrAControls) && !Array.isArray(sMessageTextOrAMessageTexts)) ||
			(Array.isArray(oTargetControlOrAControls) && Array.isArray(sMessageTextOrAMessageTexts) && sMessageTextOrAMessageTexts.length == oTargetControlOrAControls.length))) {
			throw new SyntaxError();
		}
		if (Array.isArray(oTargetControlOrAControls) && mParameter && mParameter.controlsMoreAttachValidator) {
			throw new SyntaxError();
		}
		if (mParameter && !mParameter.isAttachValidator && mParameter.isAttachFocusoutValidationImmediately) {
			throw new SyntaxError();
		}

		const oDefaultParam = {
			isAttachValidator: true,
			isAttachFocusoutValidationImmediately: true,
			isGroupedTargetControls: false,
			controlsMoreAttachValidator: null
		};
		const oParam = Object.assign({}, oDefaultParam, mParameter);

		let isTargetEqualsSapUiTableColumn = false;
		let fnValidateFunction;
		if ((!Array.isArray(oTargetControlOrAControls) && oTargetControlOrAControls instanceof Column && oTargetControlOrAControls.getParent().getBinding("rows") && oTargetControlOrAControls.getParent().getBinding("rows").getModel() instanceof JSONModel)
			|| (Array.isArray(oTargetControlOrAControls) && oTargetControlOrAControls[0] instanceof Column && oTargetControlOrAControls[0].getParent().getBinding("rows") && oTargetControlOrAControls[0].getParent().getBinding("rows").getModel() instanceof JSONModel)) {
			if (Array.isArray(oTargetControlOrAControls) && oParam.isGroupedTargetControls) {
				// 「とある列の全行の中に○○でかつ、別の列の全行の中にXXの場合、エラーとする」みたいな、列単位でグルーピングかつ複数列に跨った相関バリデーション。
				// 複雑だし、そんなに需要もないかもしれないので、一旦、サポート外とする。
				throw new SyntaxError();
			}
			isTargetEqualsSapUiTableColumn = true;

			// このバリデータ関数は validate メソッド実行時に呼ばれるものとなる
			fnValidateFunction = oValidatorInfo => {
				const isArrayTargetControl = Array.isArray(oValidatorInfo.targetControlOrControls);
				let aColumns = oValidatorInfo.targetControlOrControls;
				if (!isArrayTargetControl) {
					aColumns = [aColumns];
				}
				const oTable = aColumns[0].getParent();
				const oTableBinding = oTable.getBinding("rows");
				const sTableBindingPath = oTableBinding.getPath();
				const aModelDataRecords = oTableBinding.getModel().getProperty(sTableBindingPath);
				const aRows = oTable.getRows();
				if (aModelDataRecords.length === 0 || aRows.length === 0) {
					return true;
				}
				const sColumnIds = aColumns.map(oColumn => oColumn.getId());
				const aVisibledColIndices = [];
				oTable.getColumns().filter(oCol => oCol.getVisible()).forEach((oCol, i) => {
					if (sColumnIds.includes(oCol.getId())) {
						aVisibledColIndices.push(i);
					}
				});
				if (aVisibledColIndices.length === 0) {
					return true;
				}
				const aTargetCells = aRows[0].getCells().filter((oCell, i) => aVisibledColIndices.includes(i));
				const aTargetPropertyNames = aTargetCells.map(oTargetCell => this._resolveBindingPropertyName(oTargetCell));
				if (aTargetPropertyNames.includes(undefined)) {
					return true;
				}
				const aLabelTexts = aTargetCells.map(oTargetCell => this._getLabelText(oTargetCell));

				let isValid = true;
				if (oValidatorInfo.isGroupedTargetControls) {
					const aValues = [];
					const aTableDataRowIndices = [];
					for (let i = 0, n = aModelDataRecords.length; i < n; i++) {
						// 列単位でグルーピングかつ複数列に跨った相関バリデーション。一旦、サポート外とする
						// if (isArrayTargetControl) {
						// 	aValues.push(aTargetCells.map((oTargetCell, j) => aModelDataRecords[i][oTargetCell.getBindingPath(aTargetPropertyNames[j])]));
						// } else {
							aValues.push(aModelDataRecords[i][aTargetCells[0].getBindingPath(aTargetPropertyNames[0])]);
						// }
						aTableDataRowIndices.push(i);
					}
					if (!fnTest(aValues)) {
						isValid = false;
						this._addMessageAndInvalidTableRowCol(aColumns, sTableBindingPath, aTableDataRowIndices, oValidatorInfo.messageTextOrMessageTexts, aLabelTexts, oValidatorInfo.validateFunctionId);
					}
				} else {
					for (let i = 0, n = aModelDataRecords.length; i < n; i++) {
						let aValuesOrValue;
						if (isArrayTargetControl) {
							aValuesOrValue = aTargetCells.map((oTargetCell, j) => aModelDataRecords[i][oTargetCell.getBindingPath(aTargetPropertyNames[j])]);
						} else {
							aValuesOrValue = aModelDataRecords[i][aTargetCells[0].getBindingPath(aTargetPropertyNames[0])];
						}
						if (fnTest(aValuesOrValue)) {
							continue;
						}
						isValid = false;
						this._addMessageAndInvalidTableRowCol(aColumns, sTableBindingPath, [i], oValidatorInfo.messageTextOrMessageTexts, aLabelTexts, oValidatorInfo.validateFunctionId);
					}
				}
				return isValid;
			};
		} else {
			fnValidateFunction = oValidatorInfo => {
				const oTargetControlOrAControls = oValidatorInfo.targetControlOrControls;
				if (fnTest(oTargetControlOrAControls)) {
					// このバリデータ関数は validate メソッド実行時に呼ばれるものとなるので、エラーメッセージの除去やエラーステートの解除は不要。
					// （フォーカスアウト時のバリデータでは必要だが、それらは別途、 fnTest をラップした _registeredvalidator が _attachRegisteredValidator でアタッチされる）
					return true;
				}
				const sMessageTextOrAMessageTexts = oValidatorInfo.messageTextOrMessageTexts;
				const sValidateFunctionId = oValidatorInfo.validateFunctionId;
				if (Array.isArray(oTargetControlOrAControls)) {
					if (oValidatorInfo.isGroupedTargetControls) {
						const sMessageText = Array.isArray(sMessageTextOrAMessageTexts) ? sMessageTextOrAMessageTexts[0] : sMessageTextOrAMessageTexts;
						this._addMessage(oTargetControlOrAControls, sMessageText, null, sValidateFunctionId, null);
						
						for (let i = 0; i < oTargetControlOrAControls.length; i++) {
							this._setValueState(oTargetControlOrAControls[i], ValueState.Error, sMessageText);
						}
						return false;
					}

					for (let i = 0; i < oTargetControlOrAControls.length; i++) {
						const sMessageText = Array.isArray(sMessageTextOrAMessageTexts) ? sMessageTextOrAMessageTexts[i] : sMessageTextOrAMessageTexts;
						this._addMessage(oTargetControlOrAControls[i], sMessageText, null, sValidateFunctionId, null);
						this._setValueState(oTargetControlOrAControls[i], ValueState.Error, sMessageText);
					}
				} else {
					this._addMessage(oTargetControlOrAControls, sMessageTextOrAMessageTexts, null, sValidateFunctionId, null);
					this._setValueState(oTargetControlOrAControls, ValueState.Error, sMessageTextOrAMessageTexts);
				}
				return false;
			};
		}

		const sControlId = oControlValidateBefore.getId();

		if (this._mRegisteredValidator.has(sControlId)) {
			const aValidateFunctions = this._mRegisteredValidator.get(sControlId);
			const oValidateFunction = aValidateFunctions.find(oValidateFunction => 
				(isOriginalFunctionIdUndefined && oValidateFunction.isOriginalFunctionIdUndefined && sMessageTextOrAMessageTexts === oValidateFunction.messageTextOrMessageTexts) ||
				(!isOriginalFunctionIdUndefined && !oValidateFunction.isOriginalFunctionIdUndefined && oValidateFunction.validateFunctionId === sValidateFunctionId));
			if (oValidateFunction) {
				oValidateFunction.testFunction = fnTest;
				oValidateFunction.messageTextOrMessageTexts = sMessageTextOrAMessageTexts;
				oValidateFunction.targetControlOrControls = oTargetControlOrAControls;
				oValidateFunction.validateFunction = fnValidateFunction;
				oValidateFunction.isGroupedTargetControls = oParam.isGroupedTargetControls;
				oValidateFunction.controlsMoreAttachValidator = oParam.controlsMoreAttachValidator;
				oValidateFunction.isOriginalFunctionIdUndefined = isOriginalFunctionIdUndefined;
				oValidateFunction.isAttachValidator = oParam.isAttachValidator;
			} else {
				aValidateFunctions.push({
					validateFunctionId: sValidateFunctionId,
					testFunction: fnTest,
					messageTextOrMessageTexts: sMessageTextOrAMessageTexts,
					targetControlOrControls: oTargetControlOrAControls,
					validateFunction: fnValidateFunction,
					isGroupedTargetControls: oParam.isGroupedTargetControls,
					controlsMoreAttachValidator: oParam.controlsMoreAttachValidator,
					isOriginalFunctionIdUndefined: isOriginalFunctionIdUndefined,
					isAttachValidator: oParam.isAttachValidator
				});
			}
		} else {
			this._mRegisteredValidator.set(sControlId, [{
				validateFunctionId: sValidateFunctionId,
				testFunction: fnTest,
				messageTextOrMessageTexts: sMessageTextOrAMessageTexts,
				targetControlOrControls: oTargetControlOrAControls,
				validateFunction: fnValidateFunction,
				isGroupedTargetControls: oParam.isGroupedTargetControls,
				controlsMoreAttachValidator: oParam.controlsMoreAttachValidator,
				isOriginalFunctionIdUndefined: isOriginalFunctionIdUndefined,
				isAttachValidator: oParam.isAttachValidator
			}]);
		}
		
		if (oParam.isAttachValidator && oParam.isAttachFocusoutValidationImmediately) {
			if (isTargetEqualsSapUiTableColumn) {
				// バリデーション対象が sap.ui.table.Column の場合
				if (Array.isArray(oTargetControlOrAControls)) {
					const aColumns = oTargetControlOrAControls;
					const oTable = aColumns[0].getParent() as Table;
					const sColumnIds = aColumns.map(oColumn => oColumn.getId());
					const aVisibledColIndices = [];
					oTable.getColumns().filter(oCol => oCol.getVisible()).forEach((oCol, i) => {
						if (sColumnIds.includes(oCol.getId())) {
							aVisibledColIndices.push(i);
						}
					});
					if (aVisibledColIndices.length > 0) {
						oTable.getRows().forEach(oRow => {
							const aTargetCells = oRow.getCells().filter((oCell, i) => aVisibledColIndices.includes(i));
							this._attachRegisteredValidator(
								aTargetCells,
								fnTest,
								sMessageTextOrAMessageTexts,
								sValidateFunctionId,
								oParam.isGroupedTargetControls,
								oParam.controlsMoreAttachValidator);
						});
					}
				} else {
					const oColumn = oTargetControlOrAControls;
					const oTable = oColumn.getParent() as Table;
					const iVisibledColIndex = oTable.getColumns().filter(oCol => oCol.getVisible()).findIndex(oCol => oCol.getId() === oColumn.getId());
					if (iVisibledColIndex > 0) {
						const aTargetCells = oTable.getRows().map(oRow => oRow.getCells()[iVisibledColIndex]);
						if (oParam.isGroupedTargetControls) {
							this._attachRegisteredValidator(
								aTargetCells,
								fnTest,
								sMessageTextOrAMessageTexts,
								sValidateFunctionId,
								oParam.isGroupedTargetControls,
								oParam.controlsMoreAttachValidator);
						} else {
							aTargetCells.forEach(oTargetCell => {
								this._attachRegisteredValidator(
									oTargetCell,
									fnTest,
									sMessageTextOrAMessageTexts,
									sValidateFunctionId,
									oParam.isGroupedTargetControls,
									oParam.controlsMoreAttachValidator);
							});
						}
					}
				}
			} else {
				this._attachRegisteredValidator(
					oTargetControlOrAControls,
					fnTest,
					sMessageTextOrAMessageTexts,
					sValidateFunctionId,
					oParam.isGroupedTargetControls,
					oParam.controlsMoreAttachValidator);
			}
		}
		return this;
	};

	/**
	 * oControlValidateBefore の検証後に実行する必須チェック関数を登録する。
	 * すでに oControlValidateBefore に sValidateFunctionId の関数が登録されている場合は関数を上書きする。
	 * 
	 * @public
	 * @param {string} [sValidateFunctionId] fnTest を識別するための任意のID。省略時は自動生成される
	 * @param {testFunction} fnTest oControlValidateBefore の検証後に実行される検証用の関数
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oTargetControlOrAControls 検証対象のコントロールまたはその配列
	 * @param {sap.ui.core.Control} oControlValidateBefore {@link #validate validate} oControlValidateBefore の検証後に fnTest が実行される。fnTest の実行順を指定するためのもの
	 * @param {Object} [mParameter] オプションパラメータ
	 * @returns {Validator} Reference to this in order to allow method chaining
	 */
	registerRequiredValidator(sValidateFunctionId: string, fnTest: Function, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator
	registerRequiredValidator(fnTest: Function, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator
	registerRequiredValidator(
		sValidateFunctionIdOrTest: string | Function,
		fnTestOrTargetControlOrAControls: Function | Control | Control[],
		oTargetControlOrAControlsOrControlValidateBefore: Control | Control[],
		oControlValidateBeforeOrParameter: Control | OptionParameterOfRegisterValidator,
		mParameter?: OptionParameterOfRegisterValidator): Validator {
		if (typeof sValidateFunctionIdOrTest === "string") {
			return this._registerRequiredValidator(
				sValidateFunctionIdOrTest,
				fnTestOrTargetControlOrAControls as Function,
				oTargetControlOrAControlsOrControlValidateBefore as Control | Control[],
				oControlValidateBeforeOrParameter as Control,
				mParameter);
		}
		return this._registerRequiredValidator(
			uid(),
			sValidateFunctionIdOrTest,
			fnTestOrTargetControlOrAControls as Control | Control[],
			oTargetControlOrAControlsOrControlValidateBefore as Control,
			oControlValidateBeforeOrParameter as OptionParameterOfRegisterValidator);
	}

	private _registerRequiredValidator(sValidateFunctionId: string, fnTest: Function, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator {
		const oDefaultParam = {
			isAttachFocusoutValidationImmediately: false,
			// isGroupedTargetControls: true の場合、oTargetControlOrAControls を1つのグループとみなして検証は1回だけ（コントロール数分ではない）で、エラーメッセージも1つだけで、
			// エラーステートは全部のコントロールにつくかつかないか（一部だけつくことはない）
			isGroupedTargetControls: false,
			controlsMoreAttachValidator: null
		};
		const oParam = Object.assign({}, oDefaultParam, mParameter);

		let sMessageTextOrAMessageTexts;
		if (Array.isArray(oTargetControlOrAControls)) {
			if (oParam.controlsMoreAttachValidator) {
				throw new SyntaxError();
			}
			if (oParam.isGroupedTargetControls) {
				sMessageTextOrAMessageTexts = this._getRequiredErrorMessageTextByControl(oTargetControlOrAControls[0]);
			} else {
				sMessageTextOrAMessageTexts = oTargetControlOrAControls.map(oTargetControl => this._getRequiredErrorMessageTextByControl(oTargetControl));
			}
		} else {
			sMessageTextOrAMessageTexts = this._getRequiredErrorMessageTextByControl(oTargetControlOrAControls);
		}
		this.registerValidator(sValidateFunctionId, fnTest, sMessageTextOrAMessageTexts, oTargetControlOrAControls, oControlValidateBefore, oParam);
		return this;
	};

	/**
	 * {@link #registerValidator registerValidator} {@link #registerRequiredValidator registerRequiredValidator} で登録されている関数を登録解除する。
	 * 
	 * @public
	 * @param {string} sValidateFunctionId validateFunction を識別するための ID
	 * @param {sap.ui.core.Control} oControlValidateBefore コントロール
	 * @returns {Validator} Reference to this in order to allow method chaining
	 */
	unregisterValidator(sValidateFunctionId: string, oControlValidateBefore: Control): Validator {
		const sControlId = oControlValidateBefore.getId();
		if (!this._mRegisteredValidator.has(sControlId)) {
			return this;
		}
		const aValidateFunctions = this._mRegisteredValidator.get(sControlId);
		const iIndex = aValidateFunctions.findIndex(oValidateFunction => oValidateFunction.validateFunctionId === sValidateFunctionId);
		if (iIndex >= 0) {
			aValidateFunctions.splice(iIndex, 1);
		}
		if (aValidateFunctions.length === 0) {
			this._mRegisteredValidator.delete(sControlId);
		}
		return this;
	};

	/**
	 * 引数のオブジェクトもしくはその配下のコントロールにバリデータ関数を attach する。
	 *
	 * @private
	 * @param {ValidateTargetControlOrContainer} oTargetRootControl バリデータ関数を attach するコントロールもしくはそれを含むコンテナ
	 */
	private _attachValidator(oTargetRootControl: ValidateTargetControlOrContainer): void {
		// 非表示のコントロールも後で表示される可能性が想定されるため、処理対象とする
		if (!(oTargetRootControl instanceof Control ||
			oTargetRootControl instanceof FormContainer ||
			oTargetRootControl instanceof FormElement ||
			oTargetRootControl instanceof IconTabFilter)) {
			return;
		}

		// sap.ui.core.LabelEnablement#isRequired は対象コントロール・エレメント自体の required 属性だけでなく、
		// labelFor 属性で紐づく Label や、sap.ui.layout.form.SimpleForm 内での対象コントロール・エレメントの直前の Label の required 属性まで見て判断してくれる。
		// （なお、ariaLabelledBy で参照される Label までは見てくれない）
		// disable のコントロールも後で有効化される可能性が想定されるため、処理対象とする
		if (LabelEnablement.isRequired(oTargetRootControl)) {
			this._attachNotRegisteredValidator(oTargetRootControl);
		}
		if (this._mRegisteredValidator.has(oTargetRootControl.getId())) {
			this._mRegisteredValidator.get(oTargetRootControl.getId()).forEach(oValidateFunction => {
				if (oValidateFunction.isAttachValidator) {
					if (oTargetRootControl instanceof Table && oTargetRootControl.getBinding("rows") && oTargetRootControl.getBinding("rows").getModel() instanceof JSONModel) {
						const oTable = oTargetRootControl;

						if (Array.isArray(oValidateFunction.targetControlOrControls)) {
							const aColumns = oValidateFunction.targetControlOrControls;
							const sColumnIds = aColumns.map(oColumn => oColumn.getId());
							const aVisibledColIndices = [];
							oTable.getColumns().filter(oCol => oCol.getVisible()).forEach((oCol, i) => {
								if (sColumnIds.includes(oCol.getId())) {
									aVisibledColIndices.push(i);
								}
							});
							if (aVisibledColIndices.length > 0) {
								oTable.getRows().forEach(oRow => {
									const aTargetCells = oRow.getCells().filter((oCell, i) => aVisibledColIndices.includes(i));
									this._attachRegisteredValidator(
										aTargetCells,
										oValidateFunction.testFunction,
										oValidateFunction.messageTextOrMessageTexts,
										oValidateFunction.validateFunctionId,
										oValidateFunction.isGroupedTargetControls,
										oValidateFunction.controlsMoreAttachValidator);
								});
							}
						} else {
							const oColumn = oValidateFunction.targetControlOrControls;
							const iVisibledColIndex = oTable.getColumns().filter(oCol => oCol.getVisible()).findIndex(oCol => oCol.getId() === oColumn.getId());
							if (iVisibledColIndex > 0) {
								const aTargetCells = oTable.getRows().map(oRow => oRow.getCells()[iVisibledColIndex]);
								if (oValidateFunction.isGroupedTargetControls) {
									this._attachRegisteredValidator(
										aTargetCells,
										oValidateFunction.testFunction,
										oValidateFunction.messageTextOrMessageTexts,
										oValidateFunction.validateFunctionId,
										oValidateFunction.isGroupedTargetControls,
										oValidateFunction.controlsMoreAttachValidator);
								} else {
									aTargetCells.forEach(oTargetCell => {
										this._attachRegisteredValidator(
											oTargetCell,
											oValidateFunction.testFunction,
											oValidateFunction.messageTextOrMessageTexts,
											oValidateFunction.validateFunctionId,
											oValidateFunction.isGroupedTargetControls,
											oValidateFunction.controlsMoreAttachValidator);
									});
								}
							}
						}
					} else {
						this._attachRegisteredValidator(
							oValidateFunction.targetControlOrControls,
							oValidateFunction.testFunction,
							oValidateFunction.messageTextOrMessageTexts,
							oValidateFunction.validateFunctionId,
							oValidateFunction.isGroupedTargetControls,
							oValidateFunction.controlsMoreAttachValidator);
					}
				}
			});
		}
		// sap.ui.table.Table の場合は普通にaggregationを再帰的に処理すると存在しない行も処理対象になってしまうため、
		// Table.getBinding().getLength() してその行までの getRows() の getCells() のコントロールを処理する。
		if (oTargetRootControl instanceof Table) {
			const oTableBinding = oTargetRootControl.getBinding();
			if (oTableBinding && oTableBinding instanceof ListBinding) {
				const aRows = oTargetRootControl.getRows();
				for (let i = 0, iTableRowCount = oTableBinding.getLength(); i < iTableRowCount; i++) {
					if (aRows[i]) {
						const aCellControls = aRows[i].getCells();
						if (aCellControls) {
							for (let j = 0; j < aCellControls.length; j++) {
								this._attachValidator(aCellControls[j]);
							}
						}
					}
				}
			}
		} else {
			// sap.ui.table.Table や入力コントロールでなかった場合は、aggregation のコントロールを再帰的に処理する。
			for (let i = 0; i < this._aTargetAggregations.length; i++) {
				const aControlAggregation = oTargetRootControl.getAggregation(this._aTargetAggregations[i]);
				if (!aControlAggregation) {
					continue;
				}
				if (Array.isArray(aControlAggregation)) {
					for (let j = 0; j < aControlAggregation.length; j++) {
						const oControlAggregation = aControlAggregation[j];
						if (oControlAggregation instanceof Control ||
							oControlAggregation instanceof FormContainer ||
							oControlAggregation instanceof FormElement ||
							oControlAggregation instanceof IconTabFilter) {
							this._attachValidator(oControlAggregation);
						}
					}
				} else if (aControlAggregation instanceof Control ||
					aControlAggregation instanceof FormContainer ||
					aControlAggregation instanceof FormElement ||
					aControlAggregation instanceof IconTabFilter) {
					this._attachValidator(aControlAggregation);
				}
			}
		}
	};

	/**
	 * 引数のオブジェクトとその配下のコントロールのバリデーションを行う。
	 *
	 * @private
	 * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
	 * @returns {boolean}　true: valid, false: invalid
	 */
	private _validate(oTargetRootControl: ValidateTargetControlOrContainer): boolean {
		let isValid = true;
		const sTargetRootControlId = oTargetRootControl.getId();

		if (!((oTargetRootControl instanceof Control ||
			oTargetRootControl instanceof FormContainer ||
			oTargetRootControl instanceof FormElement ||
			oTargetRootControl instanceof IconTabFilter) &&
			oTargetRootControl.getVisible())) {

			if (!this._callRegisteredValidator(oTargetRootControl)) {
				isValid = false;
			}
			return isValid;
		}

		if (oTargetRootControl instanceof Table && oTargetRootControl.getBinding("rows") && oTargetRootControl.getBinding("rows").getModel() instanceof JSONModel) {
			// sap.ui.table.Table 配下のコントロールは画面に表示されている数だけしか存在せず、スクロール時は BindingContext が変わっていくだけなので、
			// ValueStateやValueTextをコントロールにセットするとスクロールしてデータが変わってもそのままになってしまうため、
			// バリデーションはコントロールに対してではなく、バインドされているモデルデータに対して実施し、エラーがあれば this._mInvalidTableRowCols にエラー行・列情報を保存するとともに
			// MessageのfullTargetに "/Rowのバインディングパス/エラー行のインデックス" 形式でエラーの行インデックスをセットしておく。
			// さらに、Table に rowsUpdated イベントハンドラをアタッチして、スクロール時には this._mInvalidTableRowCols の情報からValueState, ValueTextの最新化を行う。
			// MessageのｆullTargetの値は、ユーザ側で MessageDialog 等を表示する際に、参照することでメッセージクリック時にテーブルをスクロールさせてフォーカスを当てることが可能となる。
			// (e.g. example.webapp.controller.BaseController#showValidationErrorMessageDialog)
			isValid = this._validateRequiredInSapUiTableTable(oTargetRootControl);

		// sap.ui.table.Table の場合は普通にaggregationを再帰的に処理すると存在しない行も処理対象になってしまうため、
		// Table.getBinding().getLength() してその行までの getRows() の getCells() のコントロールを検証する。
		} else if (oTargetRootControl instanceof Table) {
			const oTableBinding = oTargetRootControl.getBinding("rows");
			if (oTableBinding && oTableBinding instanceof ListBinding) {
				const aRows = oTargetRootControl.getRows();
				for (let i = 0, iTableRowCount = oTableBinding.getLength(); i < iTableRowCount; i++) {
					if (aRows[i]) {
						const aCellControls = aRows[i].getCells();
						if (aCellControls) {
							for (let j = 0; j < aCellControls.length; j++) {
								if (!this._validate(aCellControls[j])) {
									isValid = false;
								}
							}
						}
					}
				}
			}
		} else {
			// sap.ui.core.LabelEnablement#isRequired は対象コントロール・エレメント自体の required 属性だけでなく、
			// labelFor 属性で紐づく Label や、sap.ui.layout.form.SimpleForm 内での対象コントロール・エレメントの直前の Label の required 属性まで見て判断してくれる。
			// （なお、ariaLabelledBy で参照される Label までは見てくれない）
			if ((("getEnabled" in oTargetRootControl && oTargetRootControl.getEnabled()) || !("getEnabled" in oTargetRootControl)) &&
				LabelEnablement.isRequired(oTargetRootControl)) {
				isValid = this._validateRequired(oTargetRootControl);
			}
			// sap.ui.table.Table や入力コントロールでなかった場合は、aggregation のコントロールを再帰的に検証する。
			for (let i = 0; i < this._aTargetAggregations.length; i++) {
				const aControlAggregation = oTargetRootControl.getAggregation(this._aTargetAggregations[i]);
				if (!aControlAggregation) {
					continue;
				}
				if (Array.isArray(aControlAggregation)) {
					for (let j = 0; j < aControlAggregation.length; j++) {
						const oControlAggregation = aControlAggregation[j];
						if (oControlAggregation instanceof Control ||
							oControlAggregation instanceof FormContainer ||
							oControlAggregation instanceof FormElement ||
							oControlAggregation instanceof IconTabFilter) {
							if (!this._validate(oControlAggregation)) {
								isValid = false;
							}
						}
					}
				} else if (aControlAggregation instanceof Control ||
					aControlAggregation instanceof FormContainer ||
					aControlAggregation instanceof FormElement ||
					aControlAggregation instanceof IconTabFilter) {
					if (!this._validate(aControlAggregation)) {
						isValid = false;
					}
				}
			}
		}
		if (!this._callRegisteredValidator(oTargetRootControl)) {
			isValid = false;
		}
		return isValid;
	};

	/**
	 * sap.ui.table.Table#indexOfColumn や #getColumns で使う非表示列を含む列インデックス値から
	 * sap.ui.table.Row#indexOfCell や #getCells で使う非表示列を除いた列インデックス値へ変換する
	 * 
	 * @private
	 * @param {sap.ui.table.Table} oSapUiTableTable テーブルコントロール
	 * @param {number[]|number} aColumnIndiciesOrIColumnIndex 非表示列を含む列インデックス値
	 * @returns {number[]} 非表示列を除いた列インデックス値
	 */
	private _toVisibledColumnIndex(oSapUiTableTable: Table, aColumnIndiciesOrIColumnIndex: number | number[]): number[] {
		const aColumns = oSapUiTableTable.getColumns();

		const convert = (iColumnIndex) => {
			let iNumberOfInVisibleColumns = 0;
			for (let i = 0, n = Math.min(aColumns.length, iColumnIndex + 1); i < n; i++) {
				if (!aColumns[i].getVisible()) {
					iNumberOfInVisibleColumns++;
				}
			}
			return iColumnIndex - iNumberOfInVisibleColumns;
		};

		let aColumnIndicies = aColumnIndiciesOrIColumnIndex;
		let bIsArray = true;
		if (!Array.isArray(aColumnIndicies)) {
			bIsArray = false;
			aColumnIndicies = [aColumnIndicies];
		}
		const results = [];
		for (let i = 0, n = aColumnIndicies.length; i < n; i++) {
			results.push(convert(aColumnIndicies[i]));
		}
		return results;
	};

	/**
	 * sap.ui.table.Table#rowsUpdated イベント用のハンドラ
	 * テーブルの画面に表示されている行について、ValueState, ValueText を最新化する。
	 * 
	 * @private
	 * @param {sap.ui.base.Event} oEvent イベント
	 */
	private _renewValueStateInTable(oEvent: Event): void {
		const oTable = oEvent.getSource();
		if (!(oTable instanceof Table)) {
			return;
		}
		const aInvalidRowCols = this._mInvalidTableRowCols.get(oTable.getId());
		if (!aInvalidRowCols) {
			return;
		}
		// スクロールしてもテーブル内のセルのValueStateは前の状態のままなので、一旦、バリデーションエラーとして保持されている列のValuteStateを全行クリアする。
		const aUniqColIds = Array.from(new Set(aInvalidRowCols.map(oInvalidRowCol => oInvalidRowCol.columnId)));
		let aUniqColIndices: number[] = [];
		for (let i = 0, n = aUniqColIds.length; i < n; i++) {
			const oColumn = ElementRegistry.get(aUniqColIds[i]);
			if (!oColumn || !(oColumn instanceof Column) || !oColumn.getVisible()) {
				continue;
			}
			aUniqColIndices.push(oTable.indexOfColumn(oColumn));
		}
		aUniqColIndices = this._toVisibledColumnIndex(oTable, aUniqColIndices);
		const aRows = oTable.getRows();
		for (let i = 0, m = aUniqColIndices.length; i < m; i++) {
			for (let j = 0, n = aRows.length; j < n; j++) {
				this._setValueState(aRows[j].getCells()[aUniqColIndices[i]], ValueState.None, null);
			}
		}
		// バリデーションエラーとして保持されている行・列情報を使って、再度、エラーデータのうち、画面に見えているセルのValueStateをエラーにする。
		if (!("model" in oTable.getBindingInfo("rows"))) {
			return;
		}
		const sTableModelName = oTable.getBindingInfo("rows")["model"];
		for (let i = 0, n = aInvalidRowCols.length; i < n; i++) {
			const oColumn = ElementRegistry.get(aInvalidRowCols[i].columnId);
			if (!oColumn || !(oColumn instanceof Column) || !oColumn.getVisible()) {
				continue;
			}
			const iVisibledColIndex = this._toVisibledColumnIndex(oTable, oTable.indexOfColumn(oColumn))[0];
			const oInvalidRow = oTable.getRows().find(oRow => oRow.getCells()[iVisibledColIndex].getBindingContext(sTableModelName).getPath() === aInvalidRowCols[i].rowPath);
			if (oInvalidRow) {
				const oInvalidCell = oInvalidRow.getCells()[iVisibledColIndex];
				this._setValueState(oInvalidCell, ValueState.Error, aInvalidRowCols[i].message);
			}
		}
	};

	/**
	 * sap.ui.table.Table#sort や #filter, #modelContextChange イベント用のハンドラ
	 * これらのイベントが発生した場合は this._mInvalidTableRowCols に保持しているバリデーションエラーの行インデックスとテーブルのデータの行が合わなくなってしまうため
	 * this._mInvalidTableRowCols に保持しているエラー行・列情報をクリアする。
	 * 
	 * @private
	 * @param {sap.ui.base.Event} oEvent イベント
	 */
	private _clearInValidRowColsInTable(oEvent: Event): void {
		const oEventSource = oEvent.getSource();
		if (!("getId" in oEventSource) || typeof oEventSource.getId !== "function") {
			return;
		}
		const sTableId = oEventSource.getId();
		if (this._mInvalidTableRowCols.has(sTableId)) {
			this._mInvalidTableRowCols.delete(sTableId);
		}
	};

	/**
	 * sap.ui.table.Table にバインドされているデータについて、バリデーションエラーとなった行・列情報をセットし、 MessageModel に Message を追加する。
	 * 
	 * @private
	 * @param {sap.ui.table.Column[]} aColumns
	 * @param {string} sTableBindingPath 
	 * @param {number[]} aTableDataRowIndices 
	 * @param {string} sMessageText 
	 * @param {string[]} aLabelTexts
	 * @param {string} sValidateFunctionId 
	 */
	private _addMessageAndInvalidTableRowCol(aColumns: Column[], sTableBindingPath: string, aTableDataRowIndices: number[], sMessageText: string, aLabelTexts: string[], sValidateFunctionId: string): void {
		let hasValidationError = false;

		aColumns.forEach((oColumn, i) => {
			const sTableId = oColumn.getParent().getId();
			const sColId = oColumn.getId();
			let aInvalidRowCols = this._mInvalidTableRowCols.get(sTableId);
			
			if (!aInvalidRowCols) {
				aInvalidRowCols = [];
				this._mInvalidTableRowCols.set(sTableId, aInvalidRowCols);
			}
			aTableDataRowIndices.forEach(iTableDataRowIndex => {
				if (!aInvalidRowCols.some(oInvalidRowCol => oInvalidRowCol.rowIndex === iTableDataRowIndex && oInvalidRowCol.columnId === sColId && oInvalidRowCol.validateFunctionId === sValidateFunctionId)) {
					aInvalidRowCols.push({rowPath: `${sTableBindingPath}/${iTableDataRowIndex}`, rowIndex: iTableDataRowIndex, columnId: sColId, message: sMessageText, validateFunctionId: sValidateFunctionId});
				} else if (i === 0) {
					hasValidationError = true;
				}
			});
		});

		if (!hasValidationError) {
			// fullTarget にセットするのは 例えば以下で1行目がエラーなら "/data/0" となる
			// <table:Table rows="{path: 'inGridTable>/data', templateShareable: false}">
			// Message に紐付けるコントロールは、セルではなく sap.ui.table.Column とする。セルだとスクロールによりコントロールとバインドされているデータが変わってしまうし、
			// 画面から見えなくなると自動的に MessageModel から削除されてしまうので。
			this._addMessage(aColumns[0], sMessageText, `${sTableBindingPath}/${aTableDataRowIndices[0]}`, sValidateFunctionId, aLabelTexts.join(", "));
		}
	};

	/**
	 * sap.ui.table.Table のスクロール時に、テーブル上のコントロールの ValueState, ValueText を最新化させるためのイベントハンドラをアタッチする。
	 * 
	 * @private
	 * @param {sap.ui.table.Table} oTable テーブル
	 */
	private _attachTableRowsUpdater(oTable: Table): void {
		if (this._sTableIdAttachedRowsUpdated.has(oTable.getId())) {
			return;
		}
		if (!this._fnDebouncedRenewValueStateInTable) {
			this._fnDebouncedRenewValueStateInTable = debounceEventHandler(this, this._renewValueStateInTable, 100);
		}
		oTable.attachRowsUpdated(this._fnDebouncedRenewValueStateInTable, this);
		oTable.attachSort(this._clearInValidRowColsInTable, this);
		oTable.attachFilter(this._clearInValidRowColsInTable, this);
		oTable.attachModelContextChange(this._clearInValidRowColsInTable, this);
		this._sTableIdAttachedRowsUpdated.add(oTable.getId());
	};

	/**
	 * oControl のバリデーションの直後に実行するように登録済のバリデータ関数を呼び出す。
	 * 
	 * @private
	 * @param {ValidateTargetControlOrContainer} oControl コントロール
	 * @returns {boolean} true: valid, false: invalid
	 */
	private _callRegisteredValidator(oControl: ValidateTargetControlOrContainer): boolean {
		let isValid = true;
		const sControlId = oControl.getId();
		let hasInvalidCellsInTable = false;

		if (this._mRegisteredValidator.has(sControlId)) {
			this._mRegisteredValidator.get(sControlId).forEach(oRegisteredValidatorInfo => {
				if (!oRegisteredValidatorInfo.validateFunction(oRegisteredValidatorInfo)) {
					isValid = false;
					if (oControl instanceof Table) {
						hasInvalidCellsInTable = true;
					}
				}
			});
		}
		if (hasInvalidCellsInTable) {
			this._attachTableRowsUpdater(oControl as Table);
		}
		return isValid;
	};

	/**
	 * oControl に必須チェック用フォーカスアウトバリデータを attach する。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 */
	_attachNotRegisteredValidator(oControl) {
		if (!oControl.attachSelectionFinish && !oControl.attachChange && !oControl.attachSelect) {
			// 対象外
			return;
		}
		const sControlId = oControl.getId();
		if (this._isAttachedValidator(sControlId, "")) {
			return;
		}
		const sMessageText = this._getRequiredErrorMessageTextByControl(oControl);
		
		this._internalAttachValidator(oControl, "", sMessageText);
	};

	/**
	 * oControl に {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたフォーカスアウトバリデータを attach する。
	 * 
	 * @private
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls コントロールまたはコントロール配列
	 * @param {testFunction} fnTest attach するバリデータ関数
	 * @param {string|string[]} sMessageTextOrAMessageTexts 検証エラーメッセージまたはその配列
	 * @param {string} sValidateFunctionId fnTest を識別するための任意のID
	 * @param {boolean} bIsGroupedTargetControls true: oControlOrAControls を1つのグループとみなして検証は1回だけ（コントロール数分ではない）で、エラーメッセージも1つだけで、エラーステートは全部のコントロールにつくかつかないか（一部だけつくことはない）,
	 *                                           false: oControlOrAControls を1つのグループとみなさない
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} [oControlOrAControlsMoreAttachValidator] oControlOrAControls 以外に fnTest を追加で attach するコントロールの配列
	 */
	_attachRegisteredValidator(oControlOrAControls, fnTest, sMessageTextOrAMessageTexts, sValidateFunctionId, bIsGroupedTargetControls, oControlOrAControlsMoreAttachValidator) {
		let aControls;
		if (!Array.isArray(oControlOrAControls)) {
			aControls = [oControlOrAControls];
		} else if (oControlOrAControls.length === 0) {
			return;
		} else {
			aControls = oControlOrAControls;
		}

		for (let i = 0; i < aControls.length; i++) {
			const oControl = aControls[i];
			const sControlId = oControl.getId();

			if (this._isAttachedValidator(sControlId, sValidateFunctionId)) {
				continue;
			}
			let sMessageText;
			if (bIsGroupedTargetControls) {
				sMessageText = Array.isArray(sMessageTextOrAMessageTexts) ? sMessageTextOrAMessageTexts[0] : sMessageTextOrAMessageTexts;
			} else {
				sMessageText = Array.isArray(sMessageTextOrAMessageTexts) ? sMessageTextOrAMessageTexts[i] : sMessageTextOrAMessageTexts;
			}
			const oData = {
				targetControl: oControl,
				messageText: sMessageText,
				test: fnTest,
				controls: aControls,
				validateFunctionId: sValidateFunctionId,
				isGroupedTargetControls: bIsGroupedTargetControls,
				messageTextOrMessageTexts: sMessageTextOrAMessageTexts
			};
			this._internalAttachValidator(oControl, sValidateFunctionId, oData);

			if (oControlOrAControlsMoreAttachValidator && i === 0) {
				let aControlsMoreAttachValidator;
				if (!Array.isArray(oControlOrAControlsMoreAttachValidator)) {
					aControlsMoreAttachValidator = [oControlOrAControlsMoreAttachValidator];
				} else {
					aControlsMoreAttachValidator = oControlOrAControlsMoreAttachValidator;
				}
				for (let j = 0; j < aControlsMoreAttachValidator.length; j++) {
					const oControlMore = aControlsMoreAttachValidator[j];
					const sControlMoreId = oControlMore.getId();
					if (this._isAttachedValidator(sControlMoreId, sValidateFunctionId)) {
						continue;
					}
					this._internalAttachValidator(oControlMore, sValidateFunctionId, oData);
				}
			}
		}
	};

	/**
	 * フォーカスアウトバリデータを attach 済みかどうかを返す。
	 * 
	 * @private
	 * @param {string} sControlId コントロールID
	 * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
	 * @returns {boolean} true: フォーカスアウトバリデータを attach 済み, false: フォーカスアウトバリデータを attach 済みでない
	 */
	_isAttachedValidator(sControlId, sValidateFunctionId) {
		const aValidateFunctionIds = this._mControlIdAttachedValidator.get(sControlId);
		if (!aValidateFunctionIds) {
			return false;
		}
		return aValidateFunctionIds.includes(sValidateFunctionId);
	};

	/**
	 * フォーカスアウトバリデータをアタッチする。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
	 * @param {any} アタッチする関数に渡すデータ
	 */
	_internalAttachValidator(oControl, sValidateFunctionId, oData) {
		const sControlId = oControl.getId();
		const markAttachedValidator = () => {
			const aValidateFunctionIds = this._mControlIdAttachedValidator.get(sControlId);
			if (aValidateFunctionIds) {
				aValidateFunctionIds.push(sValidateFunctionId);
			} else {
				this._mControlIdAttachedValidator.set(sControlId, [sValidateFunctionId]);
			}
		};
		const attachValidator = (fnValidator) => {
			if (oControl.attachSelectionFinish) {
				oControl.attachSelectionFinish(oData, fnValidator, this);
				markAttachedValidator();
			} else if (oControl.attachChange) {
				oControl.attachChange(oData, fnValidator, this);
				markAttachedValidator();
			} else if (oControl.attachSelect) {
				oControl.attachSelect(oData, fnValidator, this);
				markAttachedValidator();
			}
		};
		if (sValidateFunctionId === "") {
			attachValidator(this._notRegisteredValidator);
		} else {
			attachValidator(this._registeredvalidator);
		}
	};

	/**
	 * oControl の、本 Validator によりアタッチされているフォーカスアウトバリデータをデタッチする。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 */
	_detachAllValidators(oControl) {
		const sControlId = oControl.getId();
		const aValidateFunctionIds = this._mControlIdAttachedValidator.get();
		if (!aValidateFunctionIds) {
			return;
		}
		const detachValidator = (fnValidator) => {
			if (oControl.detachSelectionFinish) {
				oControl.detachSelectionFinish(fnValidator, this);
			} else if (oControl.detachChange) {
				oControl.detachChange(fnValidator, this);
			} else if (oControl.detachSelect) {
				oControl.detachSelect(fnValidator, this);
			}
		};
		aValidateFunctionIds.forEach(id => {
			if (id === "") {
				detachValidator(this._notRegisteredValidator);
			} else {
				detachValidator(this._registeredvalidator);
			}
		});
		this._mControlIdAttachedValidator.set(sControlId, []);
	};

	/**
	 * 必須チェック用フォーカスアウトバリデータ関数
	 * 
	 * @private
	 * @param {sap.ui.base.Event} oEvent イベント
	 * @param {string} sMessageText エラーメッセージ
	 */
	_notRegisteredValidator(oEvent, sMessageText) {
		const oControl = oEvent.getSource();
		if (this._isNullValue(oControl)) {
			if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
				this._setErrorCellInSapUiTableTable(oControl, sMessageText, "", false);
			} else {
				this._addMessage(oControl, sMessageText, undefined, undefined, undefined);
			}
			this._setValueState(oControl, ValueState.Error, sMessageText);
		} else {
			if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
				this._clearErrorCellInSapUiTableTable(oControl, "", false);
			} else {
				this._removeMessageAndValueState(oControl, "");
			}
		}
	};

	/**
	 * {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたフォーカスアウトバリデータ関数。
	 * 1つのコントロールに複数のバリデータを登録した場合でもコントロールにアタッチするイベントハンドラ関数は常にこの _registeredvalidator のみとなり、
	 * 引数の oData がバリデータ毎に異なる値になることでバリデータの内容に応じたバリデーションを行う。
	 * 
	 * @private
	 * @param {sap.ui.base.Event} oEvent イベント
	 * @param {Object} oData データ
	 * @param {function} oData.test バリデータ関数
	 * @param {sap.ui.core.Control[]} oData.controls 合わせてエラー状態がセットまたは解除されるコントロールの配列
	 * @param {boolean} oData.isGroupedTargetControls true: oData.controls を1つのグループとみなす, false: oData.controls を1つのグループとみなさない
	 * @param {string} oData.messageText エラーメッセージ
	 * @param {string} oData.validateFunctionId バリデータ関数を識別するID
	 */
	_registeredvalidator(oEvent, oData) {
		const oControl = oData.targetControl;
		const oControlOrAControls = oData.controls.length > 1 ? oData.controls : oData.controls[0];
		let isValid;

		if (this._isCellInSapUiTableTableBindedJsonModel(oControl) && oData.isGroupedTargetControls) {
			// バリデーション対象がテーブル内のセルで isGroupedTargetControls = true の場合は、列全体に対してのバリデーションとなるが、
			// 列のコントロールをすべて渡しても、スクロールで見えていない行の値が取得できないので、テーブルにバインドされている該当列の値をすべて取得してバリデータ関数に渡す。
			const oTable = oControl.getParent().getParent();
			const oTableBinding = oTable.getBinding("rows");
			const sTableBindingPath = oTableBinding.getPath();
			const aModelDataRecords = oTableBinding.getModel().getProperty(sTableBindingPath);
			const sPropertyName = this._resolveBindingPropertyName(oControl);
			const aValues = [];
			for (let i = 0; i < aModelDataRecords.length; i++) {
				aValues.push(aModelDataRecords[i][oControl.getBindingPath(sPropertyName)]);
			}
			isValid = oData.test(aValues);
		} else {
			isValid = oData.test(oControlOrAControls);
		}
		if (isValid) {
			if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
				// コントロールが配列の場合でも自身以外のコントロールの値が修正されてフォーカスアウトしたことで、自身も正常となるので対象コントロール達のエラーは解除する。
				this._clearErrorCellInSapUiTableTable(oData.controls, oData.validateFunctionId, oData.isGroupedTargetControls);
			} else {
				oData.controls.forEach(oCtl => {
					// 例えば、日付の大小関係チェックのように、自身以外のコントロールの値が修正されてフォーカスアウトしたことで、自身も正常となるので対象コントロール達のエラーは解除する。
					this._removeMessageAndValueState(oCtl, oData.validateFunctionId);
				});
			}
		} else {
			if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
				this._setErrorCellInSapUiTableTable(oData.controls, oData.messageText, oData.validateFunctionId, oData.isGroupedTargetControls);
			} else if (oData.isGroupedTargetControls) {
				this._addMessage(oData.controls, oData.messageText, undefined, oData.validateFunctionId, undefined);
				
				oData.controls.forEach(oCtl => {
					this._setValueState(oCtl, ValueState.Error, oData.messageText);
				});
			} else {
				this._addMessage(oControl, oData.messageText, undefined, oData.validateFunctionId, undefined);
				this._setValueState(oControl, ValueState.Error, oData.messageText);
			}
		}
	};

	/**
	 * oControl が JSONModel がバインドされた sap.ui.table.Table 内のセルかどうかを返します。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 * @returns true: JSONModel がバインドされた sap.ui.table.Table 内のセル, false: それ以外
	 */
	_isCellInSapUiTableTableBindedJsonModel(oControl) {
		return oControl.getParent() && oControl.getParent().getParent() instanceof Table && oControl.getParent().getParent().getBinding("rows") && oControl.getParent().getParent().getBinding("rows").getModel() instanceof JSONModel;
	}

	/**
	 * sap.ui.table.Table 内のセルについて、バリデーションエラー行・列情報への登録と、MessageModel への登録と ValueState/ValueText のセットを行います。
	 * 
	 * @private
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls sap.ui.table.Table 内のセル
	 * @param {string} sMessageText メッセージ
	 * @param {string} sValidateFunctionId registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
	 * @param {boolean} isGroupedTargetControls
	 */
	_setErrorCellInSapUiTableTable(oControlOrAControls, sMessageText, sValidateFunctionId, isGroupedTargetControls) {
		// Array.isArray(oControlOrAControls) && !isGroupedTargetControls - テーブル内の同一行内の項目相関バリデーション（e.g. A列がBの場合は、C列はDにしてください） or
		// Array.isArray(oControlOrAControls) && isGroupedTargetControls - テーブル内の同一項目内の相関バリデーション（e.g. A列のいずれかはBにしてください） or
		// !Array.isArray(oControlOrAControls) - テーブル内の単項目バリデーション
		const aControls = Array.isArray(oControlOrAControls) ? oControlOrAControls : [oControlOrAControls];
		const oRow = aControls[0].getParent();
		const oTable = oRow.getParent();
		const aVisibledColIndices = aControls.map(oControl => oRow.indexOfCell(oControl));
		const aColumns = oTable.getColumns().filter(oColumn => oColumn.getVisible()).filter((oCol, i) => aVisibledColIndices.includes(i));
		const oTableBinding = oTable.getBinding("rows");
		const sTableBindingPath = oTableBinding.getPath();
		const iRowIndex = oRow.getIndex();
		const aLabelTexts = aControls.map(oControl => this._getLabelText(oControl));

		let aTableDataRowIndices = [iRowIndex];
		if (Array.isArray(oControlOrAControls) && isGroupedTargetControls) {
			const iModelDataRecordsCount = oTableBinding.getModel().getProperty(sTableBindingPath).length;
			aTableDataRowIndices = [];
			for (let i = 0; i < iModelDataRecordsCount; i++) {
				aTableDataRowIndices.push(i);
			}
		}
		this._addMessageAndInvalidTableRowCol(aColumns, sTableBindingPath, aTableDataRowIndices, sMessageText, aLabelTexts, sValidateFunctionId);

		aControls.forEach(oCtl => this._setValueState(oCtl, ValueState.Error, sMessageText));

		this._attachTableRowsUpdater(oTable);
	};

	/**
	 * sap.ui.table.Table 内のセルについて、保持しているバリデーションエラー行・列情報をクリアし、MessageModel からの削除と ValueState/ValueText のクリアを行います。
	 * 
	 * @private
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls sap.ui.table.Table 内のセル
	 * @param {string} sValidateFunctionId registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
	 * @param {boolean} isGroupedTargetControls
	 */
	_clearErrorCellInSapUiTableTable(oControlOrAControls, sValidateFunctionId, isGroupedTargetControls) {
		let aControls;
		if (!Array.isArray(oControlOrAControls)) {
			aControls = [oControlOrAControls];
		} else if (isGroupedTargetControls) {
			aControls = [oControlOrAControls[0]];
		} else {
			aControls = oControlOrAControls;
		}
		const oRow = aControls[0].getParent();
		const oTable = oRow.getParent();
		const sTableId = oTable.getId();
		let aInvalidRowCols = this._mInvalidTableRowCols.get(sTableId);
		if (!aInvalidRowCols) {
			return;
		}
		const aVisibledColIndices = aControls.map(oControl => oRow.indexOfCell(oControl));
		const aColumns = oTable.getColumns().filter(oColumn => oColumn.getVisible()).filter((oCol, i) => aVisibledColIndices.includes(i));
		const aColumnIds = aColumns.map(oCol => oCol.getId());
		const sTableModelName = oTable.getBindingInfo("rows").model;
		const sTableBindingPath = oTable.getBinding("rows").getPath();
		const aRowBindingPaths = aVisibledColIndices.map(iVisibledColIndex => oRow.getCells()[iVisibledColIndex].getBindingContext(sTableModelName).getPath());

		if (Array.isArray(oControlOrAControls) && isGroupedTargetControls) {
			// 列単位でのエラークリアとなるので、行は無視して、列とバリデーション関数IDが一致するものは全部削除する。
			aInvalidRowCols = aInvalidRowCols.filter(oInvalidRowCol => !aColumnIds.includes(oInvalidRowCol.columnId) || oInvalidRowCol.validateFunctionId !== sValidateFunctionId);
		} else {
			aInvalidRowCols = aInvalidRowCols.filter(oInvalidRowCol => !aRowBindingPaths.includes(oInvalidRowCol.rowPath) || !aColumnIds.includes(oInvalidRowCol.columnId) || oInvalidRowCol.validateFunctionId !== sValidateFunctionId);
		}
		this._mInvalidTableRowCols.set(sTableId, aInvalidRowCols);

		// sap.ui.table.Table 配下のセルの場合、MessageModel に登録している Message の control は sap.ui.table.Column なので
		// Message の削除は Column 指定で行い、セルの ValueState, ValueText のクリアはセル指定で行う。
		const oMessageManager = sap.ui.getCore().getMessageManager();
		const oMessageModel = oMessageManager.getMessageModel();
		const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();

		const oMessage = oMessageModel.getProperty("/").find(oMsg =>
			BaseObject.isA(oMsg, sValidatorMessageName) &&
			oMsg.getControlId() === aColumnIds[0] &&
			// isGroupedTargetControls = true の場合、Message は1行目固定で1件だけ登録しているので、index = 0 固定でみる。
			((Array.isArray(oControlOrAControls) && isGroupedTargetControls && oMsg.fullTarget === `${sTableBindingPath}/0`) || aRowBindingPaths.includes(oMsg.fullTarget)) &&
			oMsg.getValidateFunctionId() === sValidateFunctionId);
		if (oMessage) {
			oMessageManager.removeMessages(oMessage);

			if (Array.isArray(oControlOrAControls)) {
				oControlOrAControls.forEach(oCtl => this._clearValueStateIfNoErrors(oCtl, this._resolveMessageTarget(oCtl)));
			} else {
				this._clearValueStateIfNoErrors(oControlOrAControls, this._resolveMessageTarget(oControlOrAControls));
			}
		}
	};

	/**
	 * 引数のコントロールの必須チェックを行う。
	 *
	 * @private
	 * @param {sap.ui.core.Control} oControl 検証対象のコントロール
	 * @returns {boolean}　true: valid、false: invalid
	 */
	_validateRequired(oControl) {
		if (!this._isNullValue(oControl)) {
			return true;
		}
		const sMessageText = this._getRequiredErrorMessageTextByControl(oControl);
		this._addMessage(oControl, sMessageText, undefined, undefined, undefined);
		this._setValueState(oControl, ValueState.Error, sMessageText);
		return false;
	};

	/**
	 * sap.ui.table.Table の required な列について、テーブルにバインドされているデータ全行に対して必須チェックを行う。
	 * 
	 * @private
	 * @param {sap.ui.table.Table} oTable 検証対象のテーブル
	 * @returns true: バリデーションOK, false: バリデーションNG
	 */
	_validateRequiredInSapUiTableTable(oTable) {
		let isValid = true;
		const oTableBinding = oTable.getBinding("rows");
		const sTableBindingPath = oTableBinding.getPath();
		const aModelDataRecords = oTableBinding.getModel().getProperty(sTableBindingPath);
		const aRows = oTable.getRows();
		if (aModelDataRecords.length > 0 && aRows.length > 0) {
			const aRequiredCells = aRows[0].getCells().filter(oCell => ((oCell.getEnabled && oCell.getEnabled()) || !oCell.getEnabled) && LabelEnablement.isRequired(oCell));
			if (aRequiredCells.length > 0) {
				const aRequiredPropertyNames = aRequiredCells.map(requiredCell => this._resolveBindingPropertyName(requiredCell));
				for (let i = 0; i < aModelDataRecords.length; i++) {
					for (let j = 0; j < aRequiredCells.length; j++) {
						if (!aRequiredPropertyNames[j]) {
							continue;
						}
						const oValue = aModelDataRecords[i][aRequiredCells[j].getBindingPath(aRequiredPropertyNames[j])];
						if ((aRequiredPropertyNames[j] === "selectedIndex" && oValue < 0) || (aRequiredPropertyNames[j] !== "selectedIndex" && (oValue === "" || oValue === null || oValue === undefined))) {
							isValid = false;
							const sMessageText = this._getRequiredErrorMessageTextByControl(aRequiredCells[j]);
							const iVisibledColIndex = aRows[0].indexOfCell(aRequiredCells[j]);
							// oRow.indexOfCell では visible=false のカラムはスキップされているのでインデックス値を合わせるためフィルタする
							const oColumn = oTable.getColumns().filter(oCol => oCol.getVisible())[iVisibledColIndex];
							this._addMessageAndInvalidTableRowCol([oColumn], sTableBindingPath, [i], sMessageText, [this._getLabelText(aRequiredCells[j])], "");
						}
					}
				}
			}
		}
		if (!isValid) {
			this._attachTableRowsUpdater(oTable);
		}
		oTable.fireRowsUpdated();
		return isValid;
	};

	/**
	 * メッセージを除去し、oControl に他にエラーがなければエラーステートをクリアする。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl 対象のコントロール
	 * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
	 */
	_removeMessageAndValueState(oControl, sValidateFunctionId) {
		const oMessageManager = sap.ui.getCore().getMessageManager();
		const oMessageModel = oMessageManager.getMessageModel();
		const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
		const sControlId = oControl.getId();

		const oMessage = oMessageModel.getProperty("/").find(oMsg =>
			BaseObject.isA(oMsg, sValidatorMessageName) &&
			oMsg.getValidationErrorControlIds().includes(sControlId) &&
			oMsg.getValidateFunctionId() === sValidateFunctionId);
		if (oMessage) {
			oMessageManager.removeMessages(oMessage);
		}
		this._clearValueStateIfNoErrors(oControl, this._resolveMessageTarget(oControl));
	};

	/**
	 * 不正な値を入力された場合、UI5標準のバリデーション(sap.ui.model.type.XXX の constraints によるバリデーション)によりエラーステートがセットされている可能性があるため、
	 * 該当のコントロールにエラーメッセージがまだあるか確認し、ない場合にのみエラーステートをクリアする。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl 処理対象のコントロール
	 * @param {string|string[]} sTargetOrATargets セットされているメッセージの中から対象のコントロールのメッセージを判別するための Message の target/targets プロパティ値
	 */
	_clearValueStateIfNoErrors(oControl, sTargetOrATargets) {
		if (!oControl.setValueState) {
			return;
		}
		let aTargets;
		if (!Array.isArray(sTargetOrATargets)) {
			aTargets = [sTargetOrATargets];
		} else if (sTargetOrATargets.length === 0) {
			return;
		} else {
			aTargets = sTargetOrATargets;
		}
		// フォーカスアウトによりUI5標準のバリデーションも実行されるため、どちらが先かやメッセージモデルに登録されるタイミング次第で、
		// ValuteState が正しくなるかならないかが変わってきてしまうため、標準バリデーションの処理が先に実行されることを期待して、非同期処理にしている。
		// TODO: 非同期処理にしても確実とは言えない。Control から sap.ui.model.type.String 等を取得して validateValue を呼べれば非同期にせずとも確実にエラーが残っているか判断できるはずなので可能ならそうした方がよい。
		setTimeout(() => {
			const aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getProperty("/");
			if (aTargets.every(sTarget => aMessages.some(oMessage => (oMessage.getTargets && oMessage.getTargets().includes(sTarget)) || oMessage.getTarget() === sTarget))) {
				return;
			}
			if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
				const oRow = oControl.getParent();
				const oTable = oRow.getParent();
				const sTableId = oTable.getId();
				let aInvalidRowCols = this._mInvalidTableRowCols.get(sTableId);
				if (!aInvalidRowCols) {
					this._setValueState(oControl, ValueState.None, null);
					return;
				}
				const iVisibledColIndex = oRow.indexOfCell(oControl);
				const oColumn = oTable.getColumns().filter(oColumn => oColumn.getVisible())[iVisibledColIndex];
				const sColId = oColumn.getId();
				const sTableModelName = oTable.getBindingInfo("rows").model;
				const sRowBindingPath = oRow.getCells()[iVisibledColIndex].getBindingContext(sTableModelName).getPath();
				const oInvalidRowCol = aInvalidRowCols.find(oInvalidRowCol => oInvalidRowCol.rowPath === sRowBindingPath && oInvalidRowCol.columnId === sColId);
				if (oInvalidRowCol) {
					// エラーがまだ残っている場合は、残っているエラーのメッセージに変更する。
					this._setValueState(oControl, ValueState.Error, oInvalidRowCol.message);
					return;	
				}
			}
			this._setValueState(oControl, ValueState.None, null);
		}, 1);
	};

	/**
	 * oControl が sParentControlId のコントロール自身もしくはその子供かどうか判定する。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl 判定対象のコントロール
	 * @param {string} sParentControlId 親コントロールID
	 * @returns {boolean} true: 親コントロール自身かその子供, false: 親コントロールでもその子供でもない
	 */
	_isChildOrEqualControlId(oControl, sParentControlId) {
		if (oControl.getId() === sParentControlId) {
			return true;
		}
		let oTargetControl = oControl;

		while (oTargetControl.getParent()) {
			if (oTargetControl.getParent().getId() === sParentControlId) {
				return true;
			}
			oTargetControl = oTargetControl.getParent();
		}
		return false;
	};

	/**
	 * oControlOrAControls に対応する {@link Message Message} の target 文字列を返す。
	 * 
	 * @private
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls コントロールまたはその配列
	 * @returns {string} target 文字列
	 */
	_resolveMessageTarget(oControlOrAControls) {
		let aControls = [];
		if (Array.isArray(oControlOrAControls)) {
			aControls = oControlOrAControls;
		} else {
			aControls.push(oControlOrAControls);
		}
		const aTargets = aControls.map(oControl => {
			if (oControl.getBinding("dateValue")) {
				return oControl.getId() + "/dateValue";
			}
			if (oControl.getBinding("value")) {
				return oControl.getId() + "/value";
			}
			if (oControl.getBinding("selectedKey")) {
				return oControl.getId() + "/selectedKey";
			}
			if (oControl.getBinding("selectedKeys")) {
				return oControl.getId() + "/selectedKeys";
			}
			if (oControl.getBinding("selected")) {
				return oControl.getId() + "/selected";
			}
			if (oControl.getBinding("selectedIndex")) {
				return oControl.getId() + "/selectedIndex";
			}
			if (oControl.getBinding("selectedDates")) {
				return oControl.getId() + "/selectedDates";
			}
			if (oControl.getBinding("text")) {
				return oControl.getId() + "/text";
			}
			return undefined;
		});
		if (aTargets.length > 0) {
			return aTargets;
		}
		return aTargets[0];
	};

	/**
	 * バインドされているプロパティ名を返します。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl 
	 * @returns バインドされているプロパティ名
	 */
	_resolveBindingPropertyName(oControl) {
		if (oControl.getBinding("dateValue")) {
			return "dateValue";
		}
		if (oControl.getBinding("value")) {
			return "value";
		}
		if (oControl.getBinding("selectedKey")) {
			return "selectedKey";
		}
		if (oControl.getBinding("selectedKeys")) {
			return "selectedKeys";
		}
		if (oControl.getBinding("selected")) {
			return "selected";
		}
		if (oControl.getBinding("selectedIndex")) {
			return "selectedIndex";
		}
		if (oControl.getBinding("selectedDates")) {
			return "selectedDates";
		}
		if (oControl.getBinding("text")) {
			return "text";
		}
		return undefined;
	}

	/**
	 * oControl の値が空か判定する。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl 検証対象のコントロール
	 * @returns {boolean} true: 値が空, false: 値が空でない
	 */
	_isNullValue(oControl) {
		if (!oControl.getValue &&
			!oControl.getSelectedKey &&
			!oControl.getSelectedKeys &&
			!oControl.getSelected &&
			!oControl.getSelectedIndex &&
			!oControl.getSelectedDates) {
			// バリデーション対象外
			return false;
		}
		// 例えば sap.m.ComboBox は getValue も getSelectedKey もあるが、選択肢から選ばずに直接値を入力した際は getSelectedKey は空文字になるので getValue で判定する必要がある。
		// このため、いずれかの値を取得するメソッドの戻り値に値が入っていれば、入力されていると判断する。
		// ただし、getSelectedIndex もあり、例えば1つ目の選択肢が「選択してください」だったとしてそれを選択していた場合、getSelectedIndex は0を返すため、
		// プルダウンフィールドは getSelectedIndex では判定できないため getSelectedIndex はみない。
		// sap.m.MultiComboBox は getValue も getSelectedKeys もあるが、getValue では値は取得できないので getSelectedKeys で判定する必要がある。
		if (oControl.getValue || oControl.getSelectedKey || oControl.getSelectedKeys || oControl.getSelected) {
			return !((oControl.getValue && oControl.getValue()) ||
				(oControl.getSelectedKey && oControl.getSelectedKey()) ||
				(oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) ||
				(oControl.getSelected && oControl.getSelected()));
		}
		if (oControl.getSelectedIndex && oControl.getSelectedIndex() >= 0) {
			return false;
		}
		if (oControl.getSelectedDates) {
			const aSelectedDates = oControl.getSelectedDates();
			if (aSelectedDates.length > 0 && aSelectedDates[0].getStartDate()) {
				return false;
			}
		}
		return true;
	};

	/**
	 * 必須エラーメッセージを返す。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 * @returns {string} 必須エラーメッセージ
	 */
	_getRequiredErrorMessageTextByControl(oControl) {
		const sRequiredInputMessage = "Required to input.";
		const sRequiredSelectMessage = "Required to select.";

		// sap.m.Input には getValue も getSelectedKey もあるので個別に判定する。
		if (oControl instanceof Input) {
			return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT, sRequiredInputMessage);
		}
		if (oControl.getSelectedKey ||
			oControl.getSelectedKeys ||
			oControl.getSelected ||
			oControl.getSelectedIndex ||
			oControl.getSelectedDates) {
			return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_SELECT, sRequiredSelectMessage);
		}
		return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT, sRequiredInputMessage);
	};

	/**
	 * リソースバンドルからテキストを取得して返す。リソースバンドルが設定されていない場合は sDefaultText を返す。
	 * 
	 * @private
	 * @param {string} sKey キー
	 * @param {string} sDefaultText デフォルトのテキスト
	 * @returns {string} テキスト
	 */
	_getResourceText(sKey, sDefaultText) {
		if (this._resourceBundle) {
			return this._resourceBundle.getText(sKey);
		}
		return sDefaultText;
	};

	/**
	 * oControl のラベルテキストを返す。
	 * 
	 * @private
	 * @param {sap.ui.core.Control} oControl コントロール
	 * @returns {string} ラベルテキスト。ラベルが見つからない場合は undefined
	 */
	_getLabelText(oControl) {
		// sap.ui.core.LabelEnablement#getReferencingLabels は
		// labelFor 属性で紐づく Label や、sap.ui.layout.form.SimpleForm 内での対象コントロール・エレメントの直前の Label まで取得してくれる。
		// （なお、ariaLabelledBy で参照される Label までは取得してくれない）
		// 試した結果は以下の通り。
		// - SimpleForm内で、labelForなし											ラベルID取得OK
		// - SimpleForm外で、labelForあり											ラベルID取得OK
		// - SimpleForm外で、labelForなし、入力コントロール側にariaLabelledByあり		ラベルID取得NG（ariaLabelledByまでは見に行かない）
		// - SimpleForm外で、labelForなし、入力コントロール側にariaLabelledByなし		ラベルID取得NG（紐付ける手がかりが一切ないので当たり前）

		// sap.m.CheckBox の場合、そのまま LabelEnablement.getReferencingLabels を取得すると各チェックボックスのラベルが取得されるので、
		// 親のコントロールのラベルを探してみる。（親のラベルが見つかるかはビューの構造による。例えば、SimpleForm 内では見つからない）
		if (oControl instanceof CheckBox) {
			const oCheckBoxParent = oControl.getParent();
			if (oCheckBoxParent && oCheckBoxParent instanceof Element) {
				const aLabelId = LabelEnablement.getReferencingLabels(oCheckBoxParent);
				if (aLabelId && aLabelId.length > 0) {
					const oLabel = ElementRegistry.get(aLabelId[0]);
					if (oLabel && "getText" in oLabel && typeof oLabel.getText === "function") {
						return oLabel.getText();
					}
				}
			}
		}
		if (oControl.getParent) {
			const oParent = oControl.getParent();

			if (oParent instanceof Row) {
				// sap.ui.table.Table, sap.ui.table.Row, sap.ui.table.Column の場合
				const oRow = oParent;
				const oTable = oRow.getParent();
				if (oTable instanceof Table) {
					const iColumnIndex = oRow.indexOfCell(oControl);
					if (iColumnIndex !== -1) {
						// oRow.indexOfCell では visible=false のカラムはスキップされているのでインデックス値を合わせるためフィルタする
						const oLabelOrSLabel = oTable.getColumns().filter(col => col.getVisible())[iColumnIndex].getLabel();
						if (typeof oLabelOrSLabel === "string") {
							return oLabelOrSLabel;
						} else if ("getText" in oLabelOrSLabel && typeof oLabelOrSLabel.getText === "function") {
							return oLabelOrSLabel.getText();
						}
					}
				}
				return undefined;
			} else if (oParent instanceof ColumnListItem) {
				// sap.m.Table, sap.m.Column, sap.m.ColumnListItem の場合
				return SapMTableUtil.getLabelText(oControl, oParent);
			}
		}
		const aLabelId = LabelEnablement.getReferencingLabels(oControl);
		if (aLabelId && aLabelId.length > 0) {
			const oLabel = ElementRegistry.get(aLabelId[0]);
			if ("getText" in oLabel && typeof oLabel.getText === "function") {
				return oLabel.getText();
			}
		}
		return undefined;
	};

	/**
	 * {@link sap.ui.core.message.MessageManager MessageManager} にメッセージを追加する。
	 *
	 * @private
	 * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls 検証エラーとなったコントロール
	 * @param {string} sMessageText エラーメッセージ
	 * @param {string} [fullTarget] Message#fullTarget
	 * @param {string} [sValidateFunctionId] {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or null or undefined
	 * @param {string} [sAdditionalText] Message#additionalText
	 */
	_addMessage(oControlOrAControls, sMessageText, fullTarget, sValidateFunctionId, sAdditionalText) {
		let oControl;
		let aControls;
		if (Array.isArray(oControlOrAControls)) {
			oControl = oControlOrAControls[0];
			aControls = oControlOrAControls;
		} else {
			oControl = oControlOrAControls;
			aControls = [oControlOrAControls];
		}
		sap.ui.getCore().getMessageManager().addMessages(new _ValidatorMessage({
			message: sMessageText,
			type: MessageType.Error,
			additionalText: sAdditionalText || this._getLabelText(oControl),
			processor: new ControlMessageProcessor(),
			target: this._resolveMessageTarget(oControlOrAControls),
			fullTarget: fullTarget ? fullTarget : "",
			validationErrorControlIds: aControls.map(oControl => oControl.getId()),
			validateFunctionId: sValidateFunctionId || ""
		}));
	};

	/**
	 * 引数のコントロールに {@link sap.ui.core.ValueState ValueState} と ValueStateText をセットする。
	 *
	 * @private
	 * @param {sap.ui.core.Control} oControl セット先のコントロール
	 * @param {sap.ui.core.ValueState} oValueState セットするステート
	 * @param {string} sText セットするステートテキスト
	 */
	_setValueState(oControl, oValueState, sText) {
		if (oControl.setValueState) {
			oControl.setValueState(oValueState);
			if (oValueState === ValueState.Error) {
				this._markSetValueStateError(oControl);
			} else if (oValueState === ValueState.None) {
				this._unmarkSetValueStateError(oControl);
			}
		}
		if (oControl.setValueStateText) {
			oControl.setValueStateText(sText);
		}
	};

	/**
	 * 本 Validator によりエラーステートをセットされているかを判定する。
	 * 
	 * @private
	 * @param {sap.ui.core.Element} oElement エレメント
	 * @returns {boolean} true: 本 Validator によりエラーステートをセットされている, false: セットされていない
	 */
	_isSetValueStateError(oElement) {
		return oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR) === "true";
	};

	/**
	 * 本 Validator によりエラーステートをセットしたとマークする。
	 * 
	 * @private
	 * @param {sap.ui.core.Element} oElement エレメント
	 */
	_markSetValueStateError(oElement) {
		oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR, "true");
	};

	/**
	 * 本 Validator によりエラーステートをセットしたとマークしていたのを外す。
	 * 
	 * @private
	 * @param {sap.ui.core.Element} oElement エレメント
	 */
	_unmarkSetValueStateError(oElement) {
		oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR, null);
	};

}

/**
 * 本 Validator で MessageManager からメッセージを削除する際に、
 * 本 Validator で追加したメッセージを型で判別可能とするためのメッセージ。
 * 
 * @namespace learnin.ui5.validator.Validator
 */
class _ValidatorMessage extends Message {
	targets;
	validationErrorControlIds;
	validateFunctionId;

	constructor(mParameters) {
		if (mParameters && Array.isArray(mParameters.target)) {
			if (!Message.prototype.getTargets) {
				// Message の target の配列サポートは UI5 1.79からなので、getTargets メソッドがない場合は、独自に配列を保持する。
				const aTargets = mParameters.target;
				if (mParameters.target.length > 0) {
					mParameters.target = mParameters.target[0];
				} else {
					delete mParameters.target;
				}
				super(mParameters);
				this.targets = aTargets;
			} else {
				super(mParameters);
			}
		} else {
			super(mParameters);
		}
		
		this.validationErrorControlIds = [];
		if (mParameters && mParameters.validationErrorControlIds && Array.isArray(mParameters.validationErrorControlIds) && mParameters.validationErrorControlIds.length > 0) {
			this.validationErrorControlIds = mParameters.validationErrorControlIds;

			// https://sapui5.hana.ondemand.com/#/api/sap.ui.core.message.Message/methods/getControlId に InputBase のコントロールにしか
			// controlIdはセットされないと書かれている。実際に、例えば RadioButton ではセットされない。なぜ、こういう仕様にしているのかは不明。
			// 本メッセージクラスではコントロールに関わらずセットする（ただし、何らかの問題が見つかった場合はセットするのをやめる可能性あり）。
			// addControlId はプライベートメソッドだが無視して呼び出す。
			if ("addControlId" in this && typeof this.addControlId === "function") {
				this.addControlId(mParameters.validationErrorControlIds[0]);
			}
		}
		this.validateFunctionId = "";
		if (mParameters && mParameters.validateFunctionId) {
			this.validateFunctionId = mParameters.validateFunctionId;
		}
	}

	/**
	 * Returns the targets of this message.
	 * 
	 * @returns {string[]} The message targets; empty array if the message has no targets
	 */
	getTargets() {
		if (Message.prototype.getTargets) {
			return Message.prototype.getTargets.call(this);
		}
		if (this.targets) {
			return this.targets;
		}
		return [];
	};

	/**
	 * 検証エラーとなったコントロールのIDを取得する。
	 * 
	 * @returns {string[]} 検証エラーとなったコントロールのID
	 */
	getValidationErrorControlIds() {
		return this.validationErrorControlIds;
	};

	/**
	 * 検証を行った関数のIDを取得する。
	 * 
	 * @returns {string} 検証を行った関数のID
	 */
	getValidateFunctionId() {
		return this.validateFunctionId;
	};
}

