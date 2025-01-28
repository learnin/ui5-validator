"use strict";

sap.ui.define(["sap/base/util/deepExtend", "sap/base/util/uid", "sap/m/CheckBox", "sap/m/ColumnListItem", "sap/m/IconTabFilter", "sap/m/Input", "sap/ui/base/Object", "sap/ui/core/Control", "sap/ui/core/Element", "sap/ui/core/LabelEnablement", "sap/ui/core/library", "sap/ui/core/message/ControlMessageProcessor", "sap/ui/core/message/Message", "sap/ui/model/json/JSONModel", "sap/ui/layout/form/FormContainer", "sap/ui/layout/form/FormElement", "sap/ui/table/Column", "sap/ui/table/Row", "sap/ui/table/Table", "sap/ui/model/ListBinding", "sap/ui/model/SimpleType", "sap/ui/model/ParseException", "sap/ui/model/ValidateException", "./SapMTableUtil"], function (deepExtend, uid, CheckBox, ColumnListItem, IconTabFilter, Input, BaseObject, Control, Element, LabelEnablement, sap_ui_core_library, ControlMessageProcessor, Message, JSONModel, FormContainer, FormElement, Column, Row, Table, ListBinding, SimpleType, ParseException, ValidateException, __SapMTableUtil) {
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const ElementRegistry = Element["registry"];
  const MessageType = sap_ui_core_library["MessageType"];
  const ValueState = sap_ui_core_library["ValueState"];
  // ui5-tooling-transpile が `import { default as sapMTable } from "sap/m/Table";` のようなデフォルトエクスポートのインポートへの別名付けの変換に対応していないため
  // デフォルトエクスポートクラス名が重複するものは別モジュールでインポートして対応している。
  const SapMTableUtil = _interopRequireDefault(__SapMTableUtil);
  /**
   * 検証対象のコントロールもしくはそれを含むコンテナ
   */
  /**
   * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} メソッドのオプション引数の型
   */
  /**
   * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} メソッドの引数のバリデーション関数の型
   *
   * @param oTargetControlOrAControlsOrValueOrValues - 検証対象のコントロールまたはその配列、または検証対象のテーブル列の値またはその配列
   * @returns true: valid、false: invalid
   */
  /**
   * {@link Validator#validate | validate} メソッドのオプション引数の型
   */
  /**
   * スクロールイベントハンドラ等、頻繁に実行されるイベントを間引くためのラッパー
   * 
   * @param thisArg - this 参照
   * @param fn - イベントハンドラ
   * @param delay - 遅延ミリ秒。最後に発生したイベントからこの期間を経過すると実行される
   * @returns イベントハンドラ
   */
  const debounceEventHandler = (thisArg, fn, delay) => {
    let timeoutId;
    return oEvent => {
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
   * T | T[] 型を T[] 型へ変換する
   * 
   * @param valueOrValues - 値または値の配列
   * @returns 引数が配列だった場合は引数そのまま、そうでない場合は引数を配列に入れたもの
   */
  const toArray = valueOrValues => {
    if (Array.isArray(valueOrValues)) {
      return valueOrValues;
    }
    return [valueOrValues];
  };

  /**
   * 引数が Column | Coulumn[] 型であることをアサーションするユーザ定義型ガード
   * 
   * @param value - アサーション対象
   */
  const assertColumnOrColumns = value => {
    if (value === null || value === undefined) {
      throw new SyntaxError("Argument is not a Column or Columns.");
    }
    const aValues = toArray(value);
    if (aValues.some(value => !(value instanceof Column))) {
      throw new SyntaxError("Argument is neither a Column nor Columns.");
    }
  };

  /**
   * バリデータクラス
   */
  class Validator extends BaseObject {
    /**
     * 入力コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
     * 
     * @remarks
     * デフォルトのメッセージを変更したい場合は、コンストラクタ引数の resourceBundle にこのプロパティキーを定義したメッセージリソースバンドルを渡してください。
     */
    RESOURCE_BUNDLE_KEY_REQUIRED_INPUT = "learnin.ui5.validator.Validator.message.requiredInput";

    /**
     * 選択コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
     * 
     * @remarks
     * デフォルトのメッセージを変更したい場合は、コンストラクタ引数の resourceBundle にこのプロパティキーを定義したメッセージリソースバンドルを渡してください。
     */
    RESOURCE_BUNDLE_KEY_REQUIRED_SELECT = "learnin.ui5.validator.Validator.message.requiredSelect";

    /**
     * バリデーションエラーにより ValueState.Error をセットされたコントロールに付加する customData 属性のキー
     */
    _CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR = "learnin.ui5.validator.Validator.IS_SET_VALUE_STATE_ERROR";

    // バリデーション対象とするコントロールの aggregation 名
    _aTargetAggregations = ["items", "content", "form", "formContainers", "formElements", "fields", "sections", "subSections", "app", "pages", "_grid", "_page", "cells",
    // sap.m.Table -> items -> cells
    "contentAreas"];
    // sap.ui.table.Table にバインドされているデータで、バリデーションエラーとなったデータの行・列情報を保持するマップ。型は Map<string, Object[]>
    // key: テーブルID,
    // value: {
    //   rowPath: {string} sap.ui.table.Rowのバインディングパス,
    //   rowIndex: {number} 行インデックス,
    //   columnId: {string} 列ID,
    //   message: {string} エラーメッセージ,
    //   validateFunctionId: {string} registerValidator/registerRequiredValidatorで登録されたバリデータID or ""(デフォルトの必須バリデータの場合)
    // }
    _mInvalidTableRowCols = new Map();
    /**
     * コンストラクタ
     * 
     * @param mParameter - パラメータ
     * @param mParameter.resourceBundle - i18n リソースバンドルクラス。デフォルトの必須バリデーションエラーメッセージを変更したい場合に指定する
     * @param mParameter.targetAggregations - バリデーション対象として追加する、コントロールの aggregation 名。デフォルトでバリデーション対象にならないコントロールがある場合に指定する
     * @param mParameter.useFocusoutValidation - isRequired="true" のコントロールおよび、registerValidator, registerRequiredValidator の対象コントロールに対し、
     * フォーカスアウト時のバリデーション関数を、validate メソッド実行時にアタッチするか。\
     * 		true （デフォルト）の場合：1度 validate するとフォーカスアウトでバリデーションが効くようになる（正しい値を入れてフォーカスアウトしてエラーが消えてもまた不正にしてフォーカスアウトするとエラーになる）\
     * 		false の場合：1度 validate すると removeErrors するまでエラーは残りっぱなしとなる\
     * 		ただし、registerValidator, registerRequiredValidator が isAttachFocusoutValidationImmediately: true で実行された場合にはそのバリデーション関数は
     * 		useFocusoutValidation の値には関係なくアタッチされる。
     * 
     * @public
     */
    constructor(mParameter) {
      super();

      // {@link Validator#registerValidator registerValidator} {@link Validator#registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数情報オブジェクト配列を保持するマップ。
      this._mRegisteredValidator = new Map();

      // フォーカスアウト時のバリデーション関数がアタッチされたコントロールIDを保持するマップ。型は Map<string, string[]>
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
     * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
     * @param option - オプション
     * @returns true: valid, false: invalid
     * 
     * @public
     */
    validate(oTargetRootControl) {
      let option = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        isDoConstraintsValidation: false
      };
      if (this._useFocusoutValidation) {
        this._attachValidator(oTargetRootControl);
      }
      return this._validate(oTargetRootControl, option.isDoConstraintsValidation);
    }
    /**
     * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより追加されたメッセージを
     * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} から除去する。
     * その結果、該当コントロールにメッセージがなくなった場合は、{@link https://sdk.openui5.org/api/sap.ui.core.ValueState | ValueState} もクリアする。
     *
     * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
     * 
     * @public
     */
    removeErrors(oTargetRootControl) {
      if (!oTargetRootControl) {
        throw new SyntaxError();
      }
      if (!(oTargetRootControl instanceof Control) && !(oTargetRootControl instanceof FormContainer) && !(oTargetRootControl instanceof FormElement) && !(oTargetRootControl instanceof IconTabFilter)) {
        // バリデート時には isVisible() も条件としているが、remove 時には変わっている可能性もなくはないため、あえて条件に入れない。
        return;
      }
      const oMessageManager = sap.ui.getCore().getMessageManager();
      const oMessageModel = oMessageManager.getMessageModel();
      const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
      const aMessagesAddedByThisValidator = oMessageModel.getProperty("/").filter(oMessage => BaseObject.isA(oMessage, sValidatorMessageName));
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
        if (oElement instanceof Control && this._isSetValueStateError(oElement) && this._isChildOrEqualControlId(oElement, sTargetRootControlId)) {
          this._clearValueStateIfNoErrors(oElement, this._resolveMessageTarget(oElement));
        }
      });
    }
    /**
     * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスによりアタッチされた関数をデタッチする。
     * 
     * @param oTargetRootControl - 対象のコントロールもしくはそれを含むコンテナ
     * 
     * @public
     */
    removeAttachedValidators(oTargetRootControl) {
      if (!oTargetRootControl) {
        throw new SyntaxError();
      }
      if (!(oTargetRootControl instanceof Control) && !(oTargetRootControl instanceof FormContainer) && !(oTargetRootControl instanceof FormElement) && !(oTargetRootControl instanceof IconTabFilter)) {
        return;
      }
      const sTargetRootControlId = oTargetRootControl.getId();
      this._mControlIdAttachedValidator.forEach((aValidateFunctionIds, sControlId) => {
        const oControl = ElementRegistry.get(sControlId);
        if (!oControl || !(oControl instanceof Control)) {
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
    }

    /**
     * バリデータにチェック関数を登録する。\
     * 登録した関数は、{@link Validator#validate | validate} メソッド実行時に実行される。\
     * また、設定によりフォーカスアウト時のバリデーション関数として対象コントロールにアタッチもされる。
     * 
     * @remarks
     * すでに oControlValidateBefore に sValidateFunctionId の関数が登録されている場合は関数を上書きする。
     * 
     * @param sValidateFunctionId - fnTest を識別するための任意のID
     * @param fnTest - チェックを行う関数
     * @param sMessageTextOrAMessageTexts - 検証エラーメッセージ
     * @param oTargetControlOrAControls - 検証対象のコントロール
     * @param oControlValidateBefore - {@link Validator#validate | validate} 実行時、oControlValidateBefore の検証後に fnTest が実行される。fnTest の実行順を指定するためのもの
     * @param mParameter - オプションパラメータ
     * @returns Reference to this in order to allow method chaining
     * 
     * @public
     */
    // oTargetControlOrAControls が配列で sMessageTextOrAMessageTexts も配列で要素数が同じはOK
    // oTargetControlOrAControls が配列で sMessageTextOrAMessageTexts がObjectもOK
    // oTargetControlOrAControls がObjectで sMessageTextOrAMessageTexts もObjectもOK

    registerValidator(sValidateFunctionIdOrTest, fnTestOrMessageTextOrAMessageTexts, sMessageTextOrAMessageTextsOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter, mParameter) {
      if (typeof sValidateFunctionIdOrTest === "string") {
        return this._registerValidator(false, sValidateFunctionIdOrTest, fnTestOrMessageTextOrAMessageTexts, sMessageTextOrAMessageTextsOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter, mParameter);
      }
      return this._registerValidator(true, uid(), sValidateFunctionIdOrTest, fnTestOrMessageTextOrAMessageTexts, sMessageTextOrAMessageTextsOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter);
    }
    _registerValidator(isOriginalFunctionIdUndefined, sValidateFunctionId, fnTest, sMessageTextOrAMessageTexts, oTargetControlOrAControls, oControlValidateBefore, mParameter) {
      if (!(!Array.isArray(oTargetControlOrAControls) && !Array.isArray(sMessageTextOrAMessageTexts) || Array.isArray(oTargetControlOrAControls) && !Array.isArray(sMessageTextOrAMessageTexts) || Array.isArray(oTargetControlOrAControls) && Array.isArray(sMessageTextOrAMessageTexts) && sMessageTextOrAMessageTexts.length == oTargetControlOrAControls.length)) {
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
      if (!Array.isArray(oTargetControlOrAControls) && oTargetControlOrAControls instanceof Column && oTargetControlOrAControls.getParent().getBinding("rows") && oTargetControlOrAControls.getParent().getBinding("rows").getModel() instanceof JSONModel || Array.isArray(oTargetControlOrAControls) && oTargetControlOrAControls[0] instanceof Column && oTargetControlOrAControls[0].getParent().getBinding("rows") && oTargetControlOrAControls[0].getParent().getBinding("rows").getModel() instanceof JSONModel) {
        if (Array.isArray(oTargetControlOrAControls) && oParam.isGroupedTargetControls) {
          // 「とある列の全行の中に○○でかつ、別の列の全行の中にXXの場合、エラーとする」みたいな、列単位でグルーピングかつ複数列に跨った相関バリデーション。
          // 複雑だし、そんなに需要もないかもしれないので、一旦、サポート外とする。
          throw new SyntaxError();
        }
        isTargetEqualsSapUiTableColumn = true;

        // このバリデータ関数は validate メソッド実行時に呼ばれるものとなる
        fnValidateFunction = oValidatorInfo => {
          assertColumnOrColumns(oValidatorInfo.targetControlOrControls);
          const aColumns = toArray(oValidatorInfo.targetControlOrControls);
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
          const isArrayTargetControl = Array.isArray(oValidatorInfo.targetControlOrControls);
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
              this._addMessage(oTargetControlOrAControls, sMessageText, sValidateFunctionId);
              for (let i = 0; i < oTargetControlOrAControls.length; i++) {
                this._setValueState(oTargetControlOrAControls[i], ValueState.Error, sMessageText);
              }
              return false;
            }
            for (let i = 0; i < oTargetControlOrAControls.length; i++) {
              const sMessageText = Array.isArray(sMessageTextOrAMessageTexts) ? sMessageTextOrAMessageTexts[i] : sMessageTextOrAMessageTexts;
              this._addMessage(oTargetControlOrAControls[i], sMessageText, sValidateFunctionId);
              this._setValueState(oTargetControlOrAControls[i], ValueState.Error, sMessageText);
            }
          } else {
            this._addMessage(oTargetControlOrAControls, sMessageTextOrAMessageTexts, sValidateFunctionId);
            this._setValueState(oTargetControlOrAControls, ValueState.Error, sMessageTextOrAMessageTexts);
          }
          return false;
        };
      }
      const sControlId = oControlValidateBefore.getId();
      if (this._mRegisteredValidator.has(sControlId)) {
        const aValidateFunctions = this._mRegisteredValidator.get(sControlId);
        const oValidateFunction = aValidateFunctions.find(oValidateFunction => isOriginalFunctionIdUndefined && oValidateFunction.isOriginalFunctionIdUndefined && sMessageTextOrAMessageTexts === oValidateFunction.messageTextOrMessageTexts || !isOriginalFunctionIdUndefined && !oValidateFunction.isOriginalFunctionIdUndefined && oValidateFunction.validateFunctionId === sValidateFunctionId);
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
            const oTable = aColumns[0].getParent();
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
                this._attachRegisteredValidator(aTargetCells, fnTest, sMessageTextOrAMessageTexts, sValidateFunctionId, oParam.isGroupedTargetControls, oParam.controlsMoreAttachValidator);
              });
            }
          } else {
            const oColumn = oTargetControlOrAControls;
            const oTable = oColumn.getParent();
            const iVisibledColIndex = oTable.getColumns().filter(oCol => oCol.getVisible()).findIndex(oCol => oCol.getId() === oColumn.getId());
            if (iVisibledColIndex > 0) {
              const aTargetCells = oTable.getRows().map(oRow => oRow.getCells()[iVisibledColIndex]);
              if (oParam.isGroupedTargetControls) {
                this._attachRegisteredValidator(aTargetCells, fnTest, sMessageTextOrAMessageTexts, sValidateFunctionId, oParam.isGroupedTargetControls, oParam.controlsMoreAttachValidator);
              } else {
                aTargetCells.forEach(oTargetCell => {
                  this._attachRegisteredValidator(oTargetCell, fnTest, sMessageTextOrAMessageTexts, sValidateFunctionId, oParam.isGroupedTargetControls, oParam.controlsMoreAttachValidator);
                });
              }
            }
          }
        } else {
          this._attachRegisteredValidator(oTargetControlOrAControls, fnTest, sMessageTextOrAMessageTexts, sValidateFunctionId, oParam.isGroupedTargetControls, oParam.controlsMoreAttachValidator);
        }
      }
      return this;
    }

    /**
     * バリデータに必須チェック関数を登録する。\
     * 登録した関数は、{@link Validator#validate | validate} メソッド実行時に実行される。\
     * また、設定によりフォーカスアウト時のバリデーション関数として対象コントロールにアタッチもされる。
     * 
     * @remarks
     * すでに oControlValidateBefore に sValidateFunctionId の関数が登録されている場合は関数を上書きする。
     * 
     * @param sValidateFunctionId - fnTest を識別するための任意のID
     * @param fnTest - 必須チェックを行う関数
     * @param oTargetControlOrAControls - 検証対象のコントロール
     * @param oControlValidateBefore - {@link Validator#validate | validate} 実行時、oControlValidateBefore の検証後に fnTest が実行される。fnTest の実行順を指定するためのもの
     * @param mParameter - オプションパラメータ
     * @returns Reference to this in order to allow method chaining
     * 
     * @public
     */

    registerRequiredValidator(sValidateFunctionIdOrTest, fnTestOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter, mParameter) {
      if (typeof sValidateFunctionIdOrTest === "string") {
        return this._registerRequiredValidator(sValidateFunctionIdOrTest, fnTestOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter, mParameter);
      }
      return this._registerRequiredValidator(uid(), sValidateFunctionIdOrTest, fnTestOrTargetControlOrAControls, oTargetControlOrAControlsOrControlValidateBefore, oControlValidateBeforeOrParameter);
    }
    _registerRequiredValidator(sValidateFunctionId, fnTest, oTargetControlOrAControls, oControlValidateBefore, mParameter) {
      const oDefaultParam = {
        isAttachFocusoutValidationImmediately: false,
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
    }
    /**
     * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されている関数を登録解除する。
     * 
     * @param sValidateFunctionId - registerValidator, registerRequiredValidator メソッドの引数で渡した sValidateFunctionId
     * @param oControlValidateBefore - registerValidator, registerRequiredValidator メソッドの引数で渡した oControlValidateBefore
     * @returns Reference to this in order to allow method chaining
     * 
     * @public
     */
    unregisterValidator(sValidateFunctionId, oControlValidateBefore) {
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
    }
    /**
     * 引数のオブジェクトもしくはその配下のコントロールにバリデータ関数をアタッチする。
     *
     * @param oTargetRootControl - バリデータ関数をアタッチするコントロールもしくはそれを含むコンテナ
     */
    _attachValidator(oTargetRootControl) {
      // 非表示のコントロールも後で表示される可能性が想定されるため、処理対象とする
      if (!(oTargetRootControl instanceof Control || oTargetRootControl instanceof FormContainer || oTargetRootControl instanceof FormElement || oTargetRootControl instanceof IconTabFilter)) {
        return;
      }

      // sap.ui.core.LabelEnablement#isRequired は対象コントロール・エレメント自体の required 属性だけでなく、
      // labelFor 属性で紐づく Label や、sap.ui.layout.form.SimpleForm 内での対象コントロール・エレメントの直前の Label の required 属性まで見て判断してくれる。
      // （なお、ariaLabelledBy で参照される Label までは見てくれない）
      // disable のコントロールも後で有効化される可能性が想定されるため、処理対象とする
      if (oTargetRootControl instanceof Control && LabelEnablement.isRequired(oTargetRootControl)) {
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
                    this._attachRegisteredValidator(aTargetCells, oValidateFunction.testFunction, oValidateFunction.messageTextOrMessageTexts, oValidateFunction.validateFunctionId, oValidateFunction.isGroupedTargetControls, oValidateFunction.controlsMoreAttachValidator);
                  });
                }
              } else {
                const oColumn = oValidateFunction.targetControlOrControls;
                const iVisibledColIndex = oTable.getColumns().filter(oCol => oCol.getVisible()).findIndex(oCol => oCol.getId() === oColumn.getId());
                if (iVisibledColIndex > 0) {
                  const aTargetCells = oTable.getRows().map(oRow => oRow.getCells()[iVisibledColIndex]);
                  if (oValidateFunction.isGroupedTargetControls) {
                    this._attachRegisteredValidator(aTargetCells, oValidateFunction.testFunction, oValidateFunction.messageTextOrMessageTexts, oValidateFunction.validateFunctionId, oValidateFunction.isGroupedTargetControls, oValidateFunction.controlsMoreAttachValidator);
                  } else {
                    aTargetCells.forEach(oTargetCell => {
                      this._attachRegisteredValidator(oTargetCell, oValidateFunction.testFunction, oValidateFunction.messageTextOrMessageTexts, oValidateFunction.validateFunctionId, oValidateFunction.isGroupedTargetControls, oValidateFunction.controlsMoreAttachValidator);
                    });
                  }
                }
              }
            } else {
              this._attachRegisteredValidator(oValidateFunction.targetControlOrControls, oValidateFunction.testFunction, oValidateFunction.messageTextOrMessageTexts, oValidateFunction.validateFunctionId, oValidateFunction.isGroupedTargetControls, oValidateFunction.controlsMoreAttachValidator);
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
              if (oControlAggregation instanceof Control || oControlAggregation instanceof FormContainer || oControlAggregation instanceof FormElement || oControlAggregation instanceof IconTabFilter) {
                this._attachValidator(oControlAggregation);
              }
            }
          } else if (aControlAggregation instanceof Control || aControlAggregation instanceof FormContainer || aControlAggregation instanceof FormElement || aControlAggregation instanceof IconTabFilter) {
            this._attachValidator(aControlAggregation);
          }
        }
      }
    }
    /**
     * 引数のオブジェクトとその配下のコントロールのバリデーションを行う。
     *
     * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
     * @param isDoConstraintsValidation - UI5 標準の constraints バリデーションも実行するか
     * @returns true: valid, false: invalid
     */
    _validate(oTargetRootControl, isDoConstraintsValidation) {
      let isValid = true;
      const sTargetRootControlId = oTargetRootControl.getId();
      if (!((oTargetRootControl instanceof Control || oTargetRootControl instanceof FormContainer || oTargetRootControl instanceof FormElement || oTargetRootControl instanceof IconTabFilter) && oTargetRootControl.getVisible())) {
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
                  if (!this._validate(aCellControls[j], isDoConstraintsValidation)) {
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
        if (oTargetRootControl instanceof Control && ("getEnabled" in oTargetRootControl && typeof oTargetRootControl.getEnabled === "function" && oTargetRootControl.getEnabled() || !("getEnabled" in oTargetRootControl))) {
          if (LabelEnablement.isRequired(oTargetRootControl)) {
            isValid = this._validateRequired(oTargetRootControl);
          }
          if (isDoConstraintsValidation && !this._isNullValue(oTargetRootControl)) {
            const sPropertyName = this._resolveBindingPropertyName(oTargetRootControl);
            const oBindingInfo = oTargetRootControl.getBindingInfo(sPropertyName);
            if (oBindingInfo && "type" in oBindingInfo && oBindingInfo.type instanceof SimpleType) {
              const oType = oBindingInfo.type;
              const oPropertyInfo = oTargetRootControl.getMetadata().getPropertyLikeSetting(sPropertyName);
              let sInternalType = null;
              if ("altTypes" in oPropertyInfo && Array.isArray(oPropertyInfo.altTypes)) {
                sInternalType = oPropertyInfo.altTypes[0];
              } else if ("type" in oPropertyInfo) {
                sInternalType = oPropertyInfo.type;
              }
              try {
                if (sPropertyName === "dateValue" && "getDateValue" in oTargetRootControl && typeof oTargetRootControl.getDateValue === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getDateValue(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getDateValue());
                } else if (sPropertyName === "value" && "getValue" in oTargetRootControl && typeof oTargetRootControl.getValue === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getValue(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getValue());
                } else if (sPropertyName === "selectedKey" && "getSelectedKey" in oTargetRootControl && typeof oTargetRootControl.getSelectedKey === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getSelectedKey(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getSelectedKey());
                } else if (sPropertyName === "selectedKeys" && "getSelectedKeys" in oTargetRootControl && typeof oTargetRootControl.getSelectedKeys === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getSelectedKeys(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getSelectedKeys());
                } else if (sPropertyName === "selected" && "getSelected" in oTargetRootControl && typeof oTargetRootControl.getSelected === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getSelected(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getSelected());
                } else if (sPropertyName === "selectedIndex" && "getSelectedIndex" in oTargetRootControl && typeof oTargetRootControl.getSelectedIndex === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getSelectedIndex(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getSelectedIndex());
                } else if (sPropertyName === "selectedDates" && "getSelectedDates" in oTargetRootControl && typeof oTargetRootControl.getSelectedDates === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getSelectedDates(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getSelectedDates());
                } else if (sPropertyName === "text" && "getText" in oTargetRootControl && typeof oTargetRootControl.getText === "function") {
                  if (sInternalType) {
                    oBindingInfo.type.parseValue(oTargetRootControl.getText(), sInternalType);
                  }
                  oBindingInfo.type.validateValue(oTargetRootControl.getText());
                }
              } catch (err) {
                if (err instanceof ParseException || err instanceof ValidateException) {
                  if ("message" in err && typeof err.message === "string") {
                    // すでにメッセージがある場合は追加しない。
                    const oMessageManager = sap.ui.getCore().getMessageManager();
                    const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
                    const existsMessage = oMessageManager.getMessageModel().getProperty("/").some(oMsg => !BaseObject.isA(oMsg, sValidatorMessageName) && oMsg.getControlId() === oTargetRootControl.getId() && oMsg.getMessage() === err.message);
                    if (!existsMessage) {
                      oMessageManager.addMessages(new Message({
                        message: err.message,
                        type: MessageType.Error,
                        additionalText: this._getLabelText(oTargetRootControl),
                        processor: new ControlMessageProcessor(),
                        target: this._resolveMessageTarget(oTargetRootControl),
                        fullTarget: ""
                      }));
                      if ("setValueState" in oTargetRootControl && typeof oTargetRootControl.setValueState === "function") {
                        oTargetRootControl.setValueState(ValueState.Error);
                      }
                      if ("setValueStateText" in oTargetRootControl && typeof oTargetRootControl.setValueStateText === "function") {
                        oTargetRootControl.setValueStateText(err.message);
                      }
                    }
                    isValid = false;
                  }
                }
              }
            }
          }
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
              if (oControlAggregation instanceof Control || oControlAggregation instanceof FormContainer || oControlAggregation instanceof FormElement || oControlAggregation instanceof IconTabFilter) {
                if (!this._validate(oControlAggregation, isDoConstraintsValidation)) {
                  isValid = false;
                }
              }
            }
          } else if (aControlAggregation instanceof Control || aControlAggregation instanceof FormContainer || aControlAggregation instanceof FormElement || aControlAggregation instanceof IconTabFilter) {
            if (!this._validate(aControlAggregation, isDoConstraintsValidation)) {
              isValid = false;
            }
          }
        }
      }
      if (!this._callRegisteredValidator(oTargetRootControl)) {
        isValid = false;
      }
      return isValid;
    }
    /**
     * sap.ui.table.Table#indexOfColumn や #getColumns で使う非表示列を含む列インデックス値から
     * sap.ui.table.Row#indexOfCell や #getCells で使う非表示列を除いた列インデックス値へ変換する
     * 
     * @param oSapUiTableTable - テーブルコントロール
     * @param aColumnIndiciesOrIColumnIndex - 非表示列を含む列インデックス値
     * @returns 非表示列を除いた列インデックス値
     */
    _toVisibledColumnIndex(oSapUiTableTable, aColumnIndiciesOrIColumnIndex) {
      const aColumns = oSapUiTableTable.getColumns();
      const convert = iColumnIndex => {
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
    }
    /**
     * sap.ui.table.Table#rowsUpdated イベント用のハンドラ
     * テーブルの画面に表示されている行について、ValueState, ValueText を最新化する。
     * 
     * @param oEvent - イベント
     */
    _renewValueStateInTable(oEvent) {
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
      let aUniqColIndices = [];
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
      const sTableModelName = oTable.getBindingInfo("rows").model;
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
    }
    /**
     * sap.ui.table.Table#sort や #filter, #modelContextChange イベント用のハンドラ
     * これらのイベントが発生した場合は this._mInvalidTableRowCols に保持しているバリデーションエラーの行インデックスとテーブルのデータの行が合わなくなってしまうため
     * this._mInvalidTableRowCols に保持しているエラー行・列情報をクリアする。
     * 
     * @param oEvent - イベント
     */
    _clearInValidRowColsInTable(oEvent) {
      const oEventSource = oEvent.getSource();
      if (!("getId" in oEventSource) || typeof oEventSource.getId !== "function") {
        return;
      }
      const sTableId = oEventSource.getId();
      if (this._mInvalidTableRowCols.has(sTableId)) {
        this._mInvalidTableRowCols.delete(sTableId);
      }
    }
    /**
     * sap.ui.table.Table にバインドされているデータについて、バリデーションエラーとなった行・列情報をセットし、 MessageModel に Message を追加する。
     * 
     * @param aColumns
     * @param sTableBindingPath 
     * @param aTableDataRowIndices 
     * @param sMessageTextOrAMessageTexts 
     * @param aLabelTexts
     * @param sValidateFunctionId
     */
    _addMessageAndInvalidTableRowCol(aColumns, sTableBindingPath, aTableDataRowIndices, sMessageTextOrAMessageTexts, aLabelTexts, sValidateFunctionId) {
      let hasValidationError = false;
      const aMessageTexts = toArray(sMessageTextOrAMessageTexts);
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
            aInvalidRowCols.push({
              rowPath: `${sTableBindingPath}/${iTableDataRowIndex}`,
              rowIndex: iTableDataRowIndex,
              columnId: sColId,
              message: aMessageTexts[i],
              validateFunctionId: sValidateFunctionId
            });
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
        this._addMessageByColumn(aColumns[0], aMessageTexts[0], sValidateFunctionId, `${sTableBindingPath}/${aTableDataRowIndices[0]}`, aLabelTexts.join(", "));
      }
    }
    /**
     * sap.ui.table.Table のスクロール時に、テーブル上のコントロールの ValueState, ValueText を最新化させるためのイベントハンドラをアタッチする。
     * 
     * @param oTable - テーブル
     */
    _attachTableRowsUpdater(oTable) {
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
    }
    /**
     * oControl のバリデーションの直後に実行するように登録済のバリデータ関数を呼び出す。
     * 
     * @param oControl - コントロール
     * @returns true: valid, false: invalid
     */
    _callRegisteredValidator(oControl) {
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
        this._attachTableRowsUpdater(oControl);
      }
      return isValid;
    }
    /**
     * oControl に必須チェック用フォーカスアウトバリデータをアタッチする。
     * 
     * @param oControl - コントロール
     */
    _attachNotRegisteredValidator(oControl) {
      if (!("attachSelectionFinish" in oControl) && !("attachChange" in oControl) && !("attachSelect" in oControl)) {
        // 対象外
        return;
      }
      const sControlId = oControl.getId();
      if (this._isAttachedValidator(sControlId, "")) {
        return;
      }
      const sMessageText = this._getRequiredErrorMessageTextByControl(oControl);
      this._internalAttachValidator(oControl, "", sMessageText);
    }
    /**
     * oControl に {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたフォーカスアウトバリデータをアタッチする。
     * 
     * @param oControlOrAControls - コントロールまたはコントロール配列
     * @param fnTest - アタッチするバリデータ関数
     * @param sMessageTextOrAMessageTexts - 検証エラーメッセージまたはその配列
     * @param ValidateFunctionId - fnTest を識別するための任意のID
     * @param bIsGroupedTargetControls - true: oControlOrAControls を1つのグループとみなして検証は1回だけ（コントロール数分ではない）で、エラーメッセージも1つだけで、エラーステートは全部のコントロールにつくかつかないか（一部だけつくことはない）,
     *                                   false: oControlOrAControls を1つのグループとみなさない
     * @param [oControlOrAControlsMoreAttachValidator] - oControlOrAControls 以外に fnTest を追加でアタッチするコントロールの配列
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
    }
    /**
     * フォーカスアウトバリデータをアタッチ済みかどうかを返す。
     * 
     * @param sControlId - コントロールID
     * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
     * @returns true: フォーカスアウトバリデータをアタッチ済み, false: フォーカスアウトバリデータをアタッチ済みでない
     */
    _isAttachedValidator(sControlId, sValidateFunctionId) {
      const aValidateFunctionIds = this._mControlIdAttachedValidator.get(sControlId);
      if (!aValidateFunctionIds) {
        return false;
      }
      return aValidateFunctionIds.includes(sValidateFunctionId);
    }
    /**
     * フォーカスアウトバリデータをアタッチする。
     * 
     * @param oControl - コントロール
     * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
     * @param oData - アタッチする関数に渡すデータ
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
      const attachValidator = fnValidator => {
        if ("attachSelectionFinish" in oControl && typeof oControl.attachSelectionFinish === "function") {
          oControl.attachSelectionFinish(oData, fnValidator, this);
          markAttachedValidator();
        } else if ("attachChange" in oControl && typeof oControl.attachChange === "function") {
          oControl.attachChange(oData, fnValidator, this);
          markAttachedValidator();
        } else if ("attachSelect" in oControl && typeof oControl.attachSelect === "function") {
          oControl.attachSelect(oData, fnValidator, this);
          markAttachedValidator();
        }
      };
      if (sValidateFunctionId === "") {
        attachValidator(this._notRegisteredValidator);
      } else {
        attachValidator(this._registeredvalidator);
      }
    }
    /**
     * oControl の、本 Validator によりアタッチされているフォーカスアウトバリデータをデタッチする。
     * 
     * @param oControl - コントロール
     */
    _detachAllValidators(oControl) {
      const sControlId = oControl.getId();
      const aValidateFunctionIds = this._mControlIdAttachedValidator.get(sControlId);
      if (!aValidateFunctionIds) {
        return;
      }
      const detachValidator = fnValidator => {
        if ("detachSelectionFinish" in oControl && typeof oControl.detachSelectionFinish === "function") {
          oControl.detachSelectionFinish(fnValidator, this);
        } else if ("detachChange" in oControl && typeof oControl.detachChange === "function") {
          oControl.detachChange(fnValidator, this);
        } else if ("detachSelect" in oControl && typeof oControl.detachSelect === "function") {
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
    }
    /**
     * 必須チェック用フォーカスアウトバリデータ関数
     * 
     * @param oEvent - イベント
     * @param sMessageText - エラーメッセージ
     */
    _notRegisteredValidator(oEvent, sMessageText) {
      const oControl = oEvent.getSource();
      if (!(oControl instanceof Control)) {
        return;
      }
      if (this._isNullValue(oControl)) {
        if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
          this._setErrorCellInSapUiTableTable(oControl, sMessageText, "", false);
        } else {
          this._addMessage(oControl, sMessageText);
        }
        this._setValueState(oControl, ValueState.Error, sMessageText);
      } else {
        if (this._isCellInSapUiTableTableBindedJsonModel(oControl)) {
          this._clearErrorCellInSapUiTableTable(oControl, "", false);
        } else {
          this._removeMessageAndValueState(oControl, "");
        }
      }
    }
    /**
     * {@link Validator#registerValidator registerValidator} や {@link Validator#registerRequiredValidator registerRequiredValidator} で登録されたフォーカスアウトバリデータ関数。
     * 1つのコントロールに複数のバリデータを登録した場合でもコントロールにアタッチするイベントハンドラ関数は常にこの _registeredvalidator のみとなり、
     * 引数の oData がバリデータ毎に異なる値になることでバリデータの内容に応じたバリデーションを行う。
     * 
     * @param oEvent - イベント
     * @param oData - データ
     * @param oData.targetControl
     * @param oData.test - バリデータ関数
     * @param oData.controls - 合わせてエラー状態がセットまたは解除されるコントロールの配列
     * @param oData.isGroupedTargetControls - true: oData.controls を1つのグループとみなす, false: oData.controls を1つのグループとみなさない
     * @param oData.messageText - エラーメッセージ
     * @param oData.validateFunctionId - バリデータ関数を識別するID
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
          this._addMessage(oData.controls, oData.messageText, oData.validateFunctionId);
          oData.controls.forEach(oCtl => {
            this._setValueState(oCtl, ValueState.Error, oData.messageText);
          });
        } else {
          this._addMessage(oControl, oData.messageText, oData.validateFunctionId);
          this._setValueState(oControl, ValueState.Error, oData.messageText);
        }
      }
    }
    /**
     * oControl が JSONModel がバインドされた sap.ui.table.Table 内のセルかどうかを返します。
     * 
     * @param oControl - コントロール
     * @returns true: JSONModel がバインドされた sap.ui.table.Table 内のセル, false: それ以外
     */
    _isCellInSapUiTableTableBindedJsonModel(oControl) {
      return oControl.getParent() && oControl.getParent().getParent() instanceof Table && oControl.getParent().getParent().getBinding("rows") && oControl.getParent().getParent().getBinding("rows").getModel() instanceof JSONModel;
    }

    /**
     * sap.ui.table.Table 内のセルについて、バリデーションエラー行・列情報への登録と、MessageModel への登録と ValueState/ValueText のセットを行います。
     * 
     * @param oControlOrAControls - sap.ui.table.Table 内のセル
     * @param sMessageText - メッセージ
     * @param sValidateFunctionId - registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
     * @param isGroupedTargetControls
     */
    _setErrorCellInSapUiTableTable(oControlOrAControls, sMessageText, sValidateFunctionId, isGroupedTargetControls) {
      // Array.isArray(oControlOrAControls) && !isGroupedTargetControls - テーブル内の同一行内の項目相関バリデーション（e.g. A列がBの場合は、C列はDにしてください） or
      // Array.isArray(oControlOrAControls) && isGroupedTargetControls - テーブル内の同一項目内の相関バリデーション（e.g. A列のいずれかはBにしてください） or
      // !Array.isArray(oControlOrAControls) - テーブル内の単項目バリデーション
      const aControls = Array.isArray(oControlOrAControls) ? oControlOrAControls : [oControlOrAControls];
      const oRow = aControls[0].getParent();
      if (!(oRow instanceof Row)) {
        return;
      }
      const oTable = oRow.getParent();
      if (!(oTable instanceof Table)) {
        return;
      }
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
    }
    /**
     * sap.ui.table.Table 内のセルについて、保持しているバリデーションエラー行・列情報をクリアし、MessageModel からの削除と ValueState/ValueText のクリアを行います。
     * 
     * @param oControlOrAControls - sap.ui.table.Table 内のセル
     * @param sValidateFunctionId - registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
     * @param isGroupedTargetControls
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
      if (!("model" in oTable.getBindingInfo("rows"))) {
        return;
      }
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
      const oMessage = oMessageModel.getProperty("/").find(oMsg => BaseObject.isA(oMsg, sValidatorMessageName) && oMsg.getControlId() === aColumnIds[0] && "fullTarget" in oMsg && (
      // isGroupedTargetControls = true の場合、Message は1行目固定で1件だけ登録しているので、index = 0 固定でみる。
      Array.isArray(oControlOrAControls) && isGroupedTargetControls && oMsg.fullTarget === `${sTableBindingPath}/0` || aRowBindingPaths.includes(oMsg.fullTarget)) && "getValidateFunctionId" in oMsg && typeof oMsg.getValidateFunctionId === "function" && oMsg.getValidateFunctionId() === sValidateFunctionId);
      if (oMessage) {
        oMessageManager.removeMessages(oMessage);
        if (Array.isArray(oControlOrAControls)) {
          oControlOrAControls.forEach(oCtl => this._clearValueStateIfNoErrors(oCtl, this._resolveMessageTarget(oCtl)));
        } else {
          this._clearValueStateIfNoErrors(oControlOrAControls, this._resolveMessageTarget(oControlOrAControls));
        }
      }
    }
    /**
     * 引数のコントロールの必須チェックを行う。
     *
     * @param oControl - 検証対象のコントロール
     * @returns true: valid、false: invalid
     */
    _validateRequired(oControl) {
      if (!this._isNullValue(oControl)) {
        return true;
      }
      const sMessageText = this._getRequiredErrorMessageTextByControl(oControl);
      this._addMessage(oControl, sMessageText);
      this._setValueState(oControl, ValueState.Error, sMessageText);
      return false;
    }
    /**
     * sap.ui.table.Table の required な列について、テーブルにバインドされているデータ全行に対して必須チェックを行う。
     * 
     * @param oTable - 検証対象のテーブル
     * @returns true: バリデーションOK, false: バリデーションNG
     */
    _validateRequiredInSapUiTableTable(oTable) {
      let isValid = true;
      const oTableBinding = oTable.getBinding("rows");
      const sTableBindingPath = oTableBinding.getPath();
      const aModelDataRecords = oTableBinding.getModel().getProperty(sTableBindingPath);
      const aRows = oTable.getRows();
      if (aModelDataRecords.length > 0 && aRows.length > 0) {
        const aRequiredCells = aRows[0].getCells().filter(oCell => ("getEnabled" in oCell && typeof oCell.getEnabled === "function" && oCell.getEnabled() || !("getEnabled" in oCell)) && LabelEnablement.isRequired(oCell));
        if (aRequiredCells.length > 0) {
          const aRequiredPropertyNames = aRequiredCells.map(requiredCell => this._resolveBindingPropertyName(requiredCell));
          for (let i = 0; i < aModelDataRecords.length; i++) {
            for (let j = 0; j < aRequiredCells.length; j++) {
              if (!aRequiredPropertyNames[j]) {
                continue;
              }
              const oValue = aModelDataRecords[i][aRequiredCells[j].getBindingPath(aRequiredPropertyNames[j])];
              if (aRequiredPropertyNames[j] === "selectedIndex" && oValue < 0 || aRequiredPropertyNames[j] !== "selectedIndex" && (oValue === "" || oValue === null || oValue === undefined)) {
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
    }
    /**
     * メッセージを除去し、oControl に他にエラーがなければエラーステートをクリアする。
     * 
     * @param oControl - 対象のコントロール
     * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
     */
    _removeMessageAndValueState(oControl, sValidateFunctionId) {
      const oMessageManager = sap.ui.getCore().getMessageManager();
      const oMessageModel = oMessageManager.getMessageModel();
      const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
      const sControlId = oControl.getId();
      const oMessage = oMessageModel.getProperty("/").find(oMsg => BaseObject.isA(oMsg, sValidatorMessageName) && oMsg.getValidationErrorControlIds().includes(sControlId) && oMsg.getValidateFunctionId() === sValidateFunctionId);
      if (oMessage) {
        oMessageManager.removeMessages(oMessage);
      }
      this._clearValueStateIfNoErrors(oControl, this._resolveMessageTarget(oControl));
    }
    /**
     * 不正な値を入力された場合、UI5標準のバリデーション(sap.ui.model.type.XXX の constraints によるバリデーション)によりエラーステートがセットされている可能性があるため、
     * 該当のコントロールにエラーメッセージがまだあるか確認し、ない場合にのみエラーステートをクリアする。
     * 
     * @param oControl - 処理対象のコントロール
     * @param sTargetOrATargets - セットされているメッセージの中から対象のコントロールのメッセージを判別するための Message の target/targets プロパティ値
     */
    _clearValueStateIfNoErrors(oControl, sTargetOrATargets) {
      if (!("setValueState" in oControl)) {
        return;
      }
      const aTargets = toArray(sTargetOrATargets);
      if (aTargets.length === 0) {
        return;
      }
      // フォーカスアウトによりUI5標準のバリデーションも実行されるため、どちらが先かやメッセージモデルに登録されるタイミング次第で、
      // ValuteState が正しくなるかならないかが変わってきてしまうため、標準バリデーションの処理が先に実行されることを期待して、非同期処理にしている。
      // TODO: 非同期処理にしても確実とは言えない。Control から sap.ui.model.type.String 等を取得して validateValue を呼べれば非同期にせずとも確実にエラーが残っているか判断できるはずなので可能ならそうした方がよい。
      setTimeout(() => {
        const aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getProperty("/");
        if (aTargets.every(sTarget => aMessages.some(oMessage => oMessage.getTargets && oMessage.getTargets().includes(sTarget) || oMessage.getTarget() === sTarget))) {
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
          const oBindingInfo = oTable.getBindingInfo("rows");
          const sTableModelName = "model" in oBindingInfo ? String(oBindingInfo.model) : undefined;
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
    }
    /**
     * oElement が sParentControlId のコントロール自身もしくはその子供かどうか判定する。
     * 
     * @param oElement - 判定対象のコントロール
     * @param sParentControlId - 親コントロールID
     * @returns true: 親コントロール自身かその子供, false: 親コントロールでもその子供でもない
     */
    _isChildOrEqualControlId(oElement, sParentControlId) {
      if (oElement.getId() === sParentControlId) {
        return true;
      }
      let oTargetControl = oElement;
      while (oTargetControl.getParent()) {
        if (oTargetControl.getParent().getId() === sParentControlId) {
          return true;
        }
        oTargetControl = oTargetControl.getParent();
      }
      return false;
    }
    /**
     * oControlOrAControls に対応する {@link https://sdk.openui5.org/api/sap.ui.core.message.Message | Message} の target 文字列を返す。
     * 
     * @param oControlOrAControls - コントロールまたはその配列
     * @returns target 文字列
     */
    _resolveMessageTarget(oControlOrAControls) {
      let aControls = [];
      if (Array.isArray(oControlOrAControls)) {
        aControls = oControlOrAControls;
      } else {
        aControls.push(oControlOrAControls);
      }
      const aTargets = aControls.map(oControl => {
        if (oControl.getBindingInfo("dateValue")) {
          return oControl.getId() + "/dateValue";
        }
        if (oControl.getBindingInfo("value")) {
          return oControl.getId() + "/value";
        }
        if (oControl.getBindingInfo("selectedKey")) {
          return oControl.getId() + "/selectedKey";
        }
        if (oControl.getBindingInfo("selectedKeys")) {
          return oControl.getId() + "/selectedKeys";
        }
        if (oControl.getBindingInfo("selected")) {
          return oControl.getId() + "/selected";
        }
        if (oControl.getBindingInfo("selectedIndex")) {
          return oControl.getId() + "/selectedIndex";
        }
        if (oControl.getBindingInfo("selectedDates")) {
          return oControl.getId() + "/selectedDates";
        }
        if (oControl.getBindingInfo("text")) {
          return oControl.getId() + "/text";
        }
        return undefined;
      });
      if (aTargets.length > 0) {
        return aTargets;
      }
      return aTargets[0];
    }
    /**
     * バインドされているプロパティ名を返します。
     * 
     * @param oControl 
     * @returns バインドされているプロパティ名
     */
    _resolveBindingPropertyName(oControl) {
      if (oControl.getBindingInfo("dateValue")) {
        return "dateValue";
      }
      if (oControl.getBindingInfo("value")) {
        return "value";
      }
      if (oControl.getBindingInfo("selectedKey")) {
        return "selectedKey";
      }
      if (oControl.getBindingInfo("selectedKeys")) {
        return "selectedKeys";
      }
      if (oControl.getBindingInfo("selected")) {
        return "selected";
      }
      if (oControl.getBindingInfo("selectedIndex")) {
        return "selectedIndex";
      }
      if (oControl.getBindingInfo("selectedDates")) {
        return "selectedDates";
      }
      if (oControl.getBindingInfo("text")) {
        return "text";
      }
      return undefined;
    }

    /**
     * oControl の値が空か判定する。
     * 
     * @param oControl - 検証対象のコントロール
     * @returns true: 値が空, false: 値が空でない
     */
    _isNullValue(oControl) {
      if (!("getValue" in oControl) && !("getSelectedKey" in oControl) && !("getSelectedKeys" in oControl) && !("getSelected" in oControl) && !("getSelectedIndex" in oControl) && !("getSelectedDates" in oControl)) {
        // バリデーション対象外
        return false;
      }
      // 例えば sap.m.ComboBox は getValue も getSelectedKey もあるが、選択肢から選ばずに直接値を入力した際は getSelectedKey は空文字になるので getValue で判定する必要がある。
      // このため、いずれかの値を取得するメソッドの戻り値に値が入っていれば、入力されていると判断する。
      // ただし、getSelectedIndex もあり、例えば1つ目の選択肢が「選択してください」だったとしてそれを選択していた場合、getSelectedIndex は0を返すため、
      // プルダウンフィールドは getSelectedIndex では判定できないため getSelectedIndex はみない。
      // sap.m.MultiComboBox は getValue も getSelectedKeys もあるが、getValue では値は取得できないので getSelectedKeys で判定する必要がある。
      if ("getValue" in oControl || "getSelectedKey" in oControl || "getSelectedKeys" in oControl || "getSelected" in oControl) {
        return !("getValue" in oControl && typeof oControl.getValue === "function" && oControl.getValue() || "getSelectedKey" in oControl && typeof oControl.getSelectedKey === "function" && oControl.getSelectedKey() || "getSelectedKeys" in oControl && typeof oControl.getSelectedKeys === "function" && oControl.getSelectedKeys().length > 0 || "getSelected" in oControl && typeof oControl.getSelected === "function" && oControl.getSelected());
      }
      if ("getSelectedIndex" in oControl && typeof oControl.getSelectedIndex === "function" && oControl.getSelectedIndex() >= 0) {
        return false;
      }
      if ("getSelectedDates" in oControl && typeof oControl.getSelectedDates === "function") {
        const aSelectedDates = oControl.getSelectedDates();
        if (aSelectedDates.length > 0 && aSelectedDates[0].getStartDate()) {
          return false;
        }
      }
      return true;
    }
    /**
     * 必須エラーメッセージを返す。
     * 
     * @param oControl - コントロール
     * @returns 必須エラーメッセージ
     */
    _getRequiredErrorMessageTextByControl(oControl) {
      const sRequiredInputMessage = "Required to input.";
      const sRequiredSelectMessage = "Required to select.";

      // sap.m.Input には getValue も getSelectedKey もあるので個別に判定する。
      if (oControl instanceof Input) {
        return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT, sRequiredInputMessage);
      }
      if ("getSelectedKey" in oControl || "getSelectedKeys" in oControl || "getSelected" in oControl || "getSelectedIndex" in oControl || "getSelectedDates" in oControl) {
        return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_SELECT, sRequiredSelectMessage);
      }
      return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT, sRequiredInputMessage);
    }
    /**
     * リソースバンドルからテキストを取得して返す。リソースバンドルが設定されていない場合は sDefaultText を返す。
     * 
     * @param sKey - キー
     * @param sDefaultText - デフォルトのテキスト
     * @returns テキスト
     */
    _getResourceText(sKey, sDefaultText) {
      if (this._resourceBundle) {
        return this._resourceBundle.getText(sKey);
      }
      return sDefaultText;
    }
    /**
     * oControl のラベルテキストを返す。
     * 
     * @param oControl - コントロール
     * @returns ラベルテキスト。ラベルが見つからない場合は undefined
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
    }
    /**
     * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} にメッセージを追加する。
     *
     * @param oControlOrAControls - 検証エラーとなったコントロール
     * @param sMessageText - エラーメッセージ
     * @param [sValidateFunctionId] - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
     */
    _addMessage(oControlOrAControls, sMessageText, sValidateFunctionId) {
      let oControl;
      let aControls;
      if (Array.isArray(oControlOrAControls)) {
        oControl = oControlOrAControls[0];
        aControls = oControlOrAControls;
      } else {
        oControl = oControlOrAControls;
        aControls = [oControlOrAControls];
      }
      const oMessageManager = sap.ui.getCore().getMessageManager();
      const oMessageModel = oMessageManager.getMessageModel();
      const sValidatorMessageName = _ValidatorMessage.getMetadata().getName();
      const sControlId = oControl.getId();

      // すでにメッセージがある場合は追加しない。
      const existsMessage = oMessageModel.getProperty("/").some(oMsg => BaseObject.isA(oMsg, sValidatorMessageName) && oMsg.getValidationErrorControlIds().includes(sControlId) && oMsg.getValidateFunctionId() === sValidateFunctionId);
      if (existsMessage) {
        return;
      }
      oMessageManager.addMessages(new _ValidatorMessage({
        message: sMessageText,
        type: MessageType.Error,
        additionalText: this._getLabelText(oControl),
        processor: new ControlMessageProcessor(),
        target: this._resolveMessageTarget(oControlOrAControls),
        fullTarget: "",
        validationErrorControlIds: aControls.map(oControl => oControl.getId()),
        validateFunctionId: sValidateFunctionId || ""
      }));
    }
    /**
     * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} にメッセージを追加する。
     *
     * @param oColumn - 検証エラーとなった Column
     * @param sMessageText - エラーメッセージ
     * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
     * @param fullTarget - Message#fullTarget
     * @param sAdditionalText - Message#additionalText
     */
    _addMessageByColumn(oColumn, sMessageText, sValidateFunctionId, fullTarget, sAdditionalText) {
      sap.ui.getCore().getMessageManager().addMessages(new _ValidatorMessage({
        message: sMessageText,
        type: MessageType.Error,
        additionalText: sAdditionalText,
        processor: new ControlMessageProcessor(),
        target: undefined,
        fullTarget: fullTarget,
        validationErrorControlIds: [oColumn.getId()],
        validateFunctionId: sValidateFunctionId || ""
      }));
    }
    /**
     * 引数のコントロールに {@link https://sdk.openui5.org/api/sap.ui.core.ValueState | ValueState} と ValueStateText をセットする。
     *
     * @param oControl - セット先のコントロール
     * @param oValueState - セットするステート
     * @param sText - セットするステートテキスト
     */
    _setValueState(oControl, oValueState, sText) {
      if ("setValueState" in oControl && typeof oControl.setValueState === "function") {
        oControl.setValueState(oValueState);
        if (oValueState === ValueState.Error) {
          this._markSetValueStateError(oControl);
        } else if (oValueState === ValueState.None) {
          this._unmarkSetValueStateError(oControl);
        }
      }
      if ("setValueStateText" in oControl && typeof oControl.setValueStateText === "function") {
        oControl.setValueStateText(sText);
      }
    }
    /**
     * 本 Validator によりエラーステートをセットされているかを判定する。
     * 
     * @param oElement - エレメント
     * @returns true: 本 Validator によりエラーステートをセットされている, false: セットされていない
     */
    _isSetValueStateError(oElement) {
      return oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR) === "true";
    }
    /**
     * 本 Validator によりエラーステートをセットしたとマークする。
     * 
     * @param oElement - エレメント
     */
    _markSetValueStateError(oElement) {
      oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR, "true");
    }
    /**
     * 本 Validator によりエラーステートをセットしたとマークしていたのを外す。
     * 
     * @param oElement - エレメント
     */
    _unmarkSetValueStateError(oElement) {
      oElement.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR, null);
    }
  }

  /**
   * 本 Validator で MessageManager からメッセージを削除する際に、
   * 本 Validator で追加したメッセージを型で判別可能とするためのメッセージ。
   * 
   * @namespace learnin.ui5.validator.Validator
   */
  const _ValidatorMessage = Message.extend("learnin.ui5.validator.Validator._ValidatorMessage", {
    constructor: function _constructor(mParameters) {
      if (mParameters && Array.isArray(mParameters.target)) {
        if (!Message.prototype.getTargets) {
          // Message の target の配列サポートは UI5 1.79からなので、getTargets メソッドがない場合は、独自に配列を保持する。
          const aTargets = mParameters.target;
          if (mParameters.target.length > 0) {
            mParameters.target = mParameters.target[0];
          } else {
            delete mParameters.target;
          }
          Message.prototype.constructor.call(this, mParameters);
          this.targets = aTargets;
        } else {
          Message.prototype.constructor.call(this, mParameters);
        }
      } else {
        Message.prototype.constructor.call(this, mParameters);
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
    },
    getTargets: function _getTargets() {
      if (Message.prototype.getTargets) {
        return Message.prototype.getTargets.call(this);
      }
      if (this.targets) {
        return this.targets;
      }
      return [];
    },
    getValidationErrorControlIds: function _getValidationErrorControlIds() {
      return this.validationErrorControlIds;
    },
    getValidateFunctionId: function _getValidateFunctionId() {
      return this.validateFunctionId;
    }
  });
  return Validator;
});