/// <reference types="openui5" />
/// <reference types="openui5" />
/// <reference types="openui5" />
/// <reference types="openui5" />
declare module "learnin/ui5/validator/Validator" {
    import IconTabFilter from "sap/m/IconTabFilter";
    import BaseObject from "sap/ui/base/Object";
    import Control from "sap/ui/core/Control";
    import { MessageType } from "sap/ui/core/library";
    import Message from "sap/ui/core/message/Message";
    import MessageProcessor from "sap/ui/core/message/MessageProcessor";
    import FormContainer from "sap/ui/layout/form/FormContainer";
    import FormElement from "sap/ui/layout/form/FormElement";
    import Column from "sap/ui/table/Column";
    import ResourceBundle from "sap/base/i18n/ResourceBundle";
    import Event from "sap/ui/base/Event";
    type ValidateTargetControlOrContainer = Control | FormContainer | FormElement | IconTabFilter;
    type OptionParameterOfRegisterValidator = {
        isAttachValidator: boolean;
        isAttachFocusoutValidationImmediately: boolean;
        isGroupedTargetControls: boolean;
        controlsMoreAttachValidator: Control | Control[];
    };
    type ValidatorInfo = {
        validateFunctionId: string;
        testFunction: Function;
        messageTextOrMessageTexts: string | string[];
        targetControlOrControls: Control | Control[];
        validateFunction: (oValidatorInfo: ValidatorInfo) => boolean;
        isGroupedTargetControls: boolean;
        controlsMoreAttachValidator: Control | Control[];
        isOriginalFunctionIdUndefined: boolean;
        isAttachValidator: boolean;
    };
    type ValidateOption = {
        isDoConstraintsValidation: boolean;
    };
    /**
     * スクロールイベントハンドラ等、頻繁に実行されるイベントを間引くためのラッパー
     *
     * @param {object} thisArg this 参照
     * @param {Function} fn イベントハンドラ
     * @param {number} delay 遅延ミリ秒。最後に発生したイベントからこの期間を経過すると実行される
     * @returns {Function} イベントハンドラ
     */
    const debounceEventHandler: (thisArg: object, fn: Function, delay: number) => (oEvent: Event) => void;
    /**
     * T | T[] 型を T[] 型へ変換する
     *
     * @param valueOrValues
     * @returns 引数が配列だった場合は引数そのまま、そうでない場合は引数を配列に入れたもの
     */
    const toArray: <T>(valueOrValues: T | T[]) => T[];
    /**
     * 引数が Column | Coulumn[] 型であることをアサーションするユーザ定義型ガード
     *
     * @param value アサーション対象
     */
    const assertColumnOrColumns: (value: any) => asserts value is Column | Column[];
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
        RESOURCE_BUNDLE_KEY_REQUIRED_INPUT: string;
        /**
         * 選択コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
         */
        RESOURCE_BUNDLE_KEY_REQUIRED_SELECT: string;
        /**
         * バリデーションエラーにより ValueState.Error をセットされたコントロールに付加する customData 属性のキー
         */
        private _CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR;
        private _aTargetAggregations;
        private _mRegisteredValidator;
        private _mControlIdAttachedValidator;
        private _mInvalidTableRowCols;
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
            resourceBundle: ResourceBundle;
            targetAggregations: string | string[];
            useFocusoutValidation: boolean;
        });
        /**
         * 引数のオブジェクトもしくはその配下のコントロールのバリデーションを行う。
         *
         * @public
         * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
         * @param {ValidateOption} [option] オプション
         * @returns {boolean} true: valid, false: invalid
         */
        validate(oTargetRootControl: ValidateTargetControlOrContainer, option?: ValidateOption): boolean;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより追加されたメッセージを
         * {@link sap.ui.core.message.MessageManager MessageManager} から除去する。
         * その結果、該当コントロールにメッセージがなくなった場合は、{@link sap.ui.core.ValueState ValueState} もクリアする。
         *
         * @public
         * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
         */
        removeErrors(oTargetRootControl: ValidateTargetControlOrContainer): void;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより attach された関数を detach する。
         *
         * @public
         * @param {ValidateTargetControlOrContainer} oTargetRootControl 対象のコントロールもしくはそれを含むコンテナ
         */
        removeAttachedValidators(oTargetRootControl: ValidateTargetControlOrContainer): void;
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
        registerValidator(sValidateFunctionId: string, fnTest: Function, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        registerValidator(fnTest: Function, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        private _registerValidator;
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
        registerRequiredValidator(sValidateFunctionId: string, fnTest: Function, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        registerRequiredValidator(fnTest: Function, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        private _registerRequiredValidator;
        /**
         * {@link #registerValidator registerValidator} {@link #registerRequiredValidator registerRequiredValidator} で登録されている関数を登録解除する。
         *
         * @public
         * @param {string} sValidateFunctionId validateFunction を識別するための ID
         * @param {sap.ui.core.Control} oControlValidateBefore コントロール
         * @returns {Validator} Reference to this in order to allow method chaining
         */
        unregisterValidator(sValidateFunctionId: string, oControlValidateBefore: Control): Validator;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールにバリデータ関数を attach する。
         *
         * @private
         * @param {ValidateTargetControlOrContainer} oTargetRootControl バリデータ関数を attach するコントロールもしくはそれを含むコンテナ
         */
        private _attachValidator;
        /**
         * 引数のオブジェクトとその配下のコントロールのバリデーションを行う。
         *
         * @private
         * @param {ValidateTargetControlOrContainer} oTargetRootControl 検証対象のコントロールもしくはそれを含むコンテナ
         * @param {boolean} isDoConstraintsValidation UI5 標準の constraints バリデーションも実行するか
         * @returns {boolean}　true: valid, false: invalid
         */
        private _validate;
        /**
         * sap.ui.table.Table#indexOfColumn や #getColumns で使う非表示列を含む列インデックス値から
         * sap.ui.table.Row#indexOfCell や #getCells で使う非表示列を除いた列インデックス値へ変換する
         *
         * @private
         * @param {sap.ui.table.Table} oSapUiTableTable テーブルコントロール
         * @param {number[]|number} aColumnIndiciesOrIColumnIndex 非表示列を含む列インデックス値
         * @returns {number[]} 非表示列を除いた列インデックス値
         */
        private _toVisibledColumnIndex;
        /**
         * sap.ui.table.Table#rowsUpdated イベント用のハンドラ
         * テーブルの画面に表示されている行について、ValueState, ValueText を最新化する。
         *
         * @private
         * @param {sap.ui.base.Event} oEvent イベント
         */
        private _renewValueStateInTable;
        /**
         * sap.ui.table.Table#sort や #filter, #modelContextChange イベント用のハンドラ
         * これらのイベントが発生した場合は this._mInvalidTableRowCols に保持しているバリデーションエラーの行インデックスとテーブルのデータの行が合わなくなってしまうため
         * this._mInvalidTableRowCols に保持しているエラー行・列情報をクリアする。
         *
         * @private
         * @param {sap.ui.base.Event} oEvent イベント
         */
        private _clearInValidRowColsInTable;
        /**
         * sap.ui.table.Table にバインドされているデータについて、バリデーションエラーとなった行・列情報をセットし、 MessageModel に Message を追加する。
         *
         * @private
         * @param {sap.ui.table.Column[]} aColumns
         * @param {string} sTableBindingPath
         * @param {number[]} aTableDataRowIndices
         * @param {string|string[]} sMessageTextOrAMessageTexts
         * @param {string[]} aLabelTexts
         * @param {string} sValidateFunctionId
         */
        private _addMessageAndInvalidTableRowCol;
        /**
         * sap.ui.table.Table のスクロール時に、テーブル上のコントロールの ValueState, ValueText を最新化させるためのイベントハンドラをアタッチする。
         *
         * @private
         * @param {sap.ui.table.Table} oTable テーブル
         */
        private _attachTableRowsUpdater;
        /**
         * oControl のバリデーションの直後に実行するように登録済のバリデータ関数を呼び出す。
         *
         * @private
         * @param {ValidateTargetControlOrContainer} oControl コントロール
         * @returns {boolean} true: valid, false: invalid
         */
        private _callRegisteredValidator;
        /**
         * oControl に必須チェック用フォーカスアウトバリデータを attach する。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         */
        private _attachNotRegisteredValidator;
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
        private _attachRegisteredValidator;
        /**
         * フォーカスアウトバリデータを attach 済みかどうかを返す。
         *
         * @private
         * @param {string} sControlId コントロールID
         * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         * @returns {boolean} true: フォーカスアウトバリデータを attach 済み, false: フォーカスアウトバリデータを attach 済みでない
         */
        private _isAttachedValidator;
        /**
         * フォーカスアウトバリデータをアタッチする。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         * @param {object|string} アタッチする関数に渡すデータ
         */
        private _internalAttachValidator;
        /**
         * oControl の、本 Validator によりアタッチされているフォーカスアウトバリデータをデタッチする。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         */
        private _detachAllValidators;
        /**
         * 必須チェック用フォーカスアウトバリデータ関数
         *
         * @private
         * @param {sap.ui.base.Event} oEvent イベント
         * @param {string} sMessageText エラーメッセージ
         */
        private _notRegisteredValidator;
        /**
         * {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたフォーカスアウトバリデータ関数。
         * 1つのコントロールに複数のバリデータを登録した場合でもコントロールにアタッチするイベントハンドラ関数は常にこの _registeredvalidator のみとなり、
         * 引数の oData がバリデータ毎に異なる値になることでバリデータの内容に応じたバリデーションを行う。
         *
         * @private
         * @param {sap.ui.base.Event} oEvent イベント
         * @param {Object} oData データ
         * @param {sap.ui.core.Control} oData.targetControl
         * @param {function} oData.test バリデータ関数
         * @param {sap.ui.core.Control[]} oData.controls 合わせてエラー状態がセットまたは解除されるコントロールの配列
         * @param {boolean} oData.isGroupedTargetControls true: oData.controls を1つのグループとみなす, false: oData.controls を1つのグループとみなさない
         * @param {string} oData.messageText エラーメッセージ
         * @param {string} oData.validateFunctionId バリデータ関数を識別するID
         */
        private _registeredvalidator;
        /**
         * oControl が JSONModel がバインドされた sap.ui.table.Table 内のセルかどうかを返します。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         * @returns {boolean} true: JSONModel がバインドされた sap.ui.table.Table 内のセル, false: それ以外
         */
        private _isCellInSapUiTableTableBindedJsonModel;
        /**
         * sap.ui.table.Table 内のセルについて、バリデーションエラー行・列情報への登録と、MessageModel への登録と ValueState/ValueText のセットを行います。
         *
         * @private
         * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls sap.ui.table.Table 内のセル
         * @param {string} sMessageText メッセージ
         * @param {string} sValidateFunctionId registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
         * @param {boolean} isGroupedTargetControls
         */
        private _setErrorCellInSapUiTableTable;
        /**
         * sap.ui.table.Table 内のセルについて、保持しているバリデーションエラー行・列情報をクリアし、MessageModel からの削除と ValueState/ValueText のクリアを行います。
         *
         * @private
         * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls sap.ui.table.Table 内のセル
         * @param {string} sValidateFunctionId registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
         * @param {boolean} isGroupedTargetControls
         */
        private _clearErrorCellInSapUiTableTable;
        /**
         * 引数のコントロールの必須チェックを行う。
         *
         * @private
         * @param {sap.ui.core.Control} oControl 検証対象のコントロール
         * @returns {boolean}　true: valid、false: invalid
         */
        private _validateRequired;
        /**
         * sap.ui.table.Table の required な列について、テーブルにバインドされているデータ全行に対して必須チェックを行う。
         *
         * @private
         * @param {sap.ui.table.Table} oTable 検証対象のテーブル
         * @returns true: バリデーションOK, false: バリデーションNG
         */
        private _validateRequiredInSapUiTableTable;
        /**
         * メッセージを除去し、oControl に他にエラーがなければエラーステートをクリアする。
         *
         * @private
         * @param {sap.ui.core.Control} oControl 対象のコントロール
         * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         */
        private _removeMessageAndValueState;
        /**
         * 不正な値を入力された場合、UI5標準のバリデーション(sap.ui.model.type.XXX の constraints によるバリデーション)によりエラーステートがセットされている可能性があるため、
         * 該当のコントロールにエラーメッセージがまだあるか確認し、ない場合にのみエラーステートをクリアする。
         *
         * @private
         * @param {sap.ui.core.Control} oControl 処理対象のコントロール
         * @param {undefined|string|string[]} sTargetOrATargets セットされているメッセージの中から対象のコントロールのメッセージを判別するための Message の target/targets プロパティ値
         */
        private _clearValueStateIfNoErrors;
        /**
         * oElement が sParentControlId のコントロール自身もしくはその子供かどうか判定する。
         *
         * @private
         * @param {sap.ui.core.Element} oElement 判定対象のコントロール
         * @param {string} sParentControlId 親コントロールID
         * @returns {boolean} true: 親コントロール自身かその子供, false: 親コントロールでもその子供でもない
         */
        private _isChildOrEqualControlId;
        /**
         * oControlOrAControls に対応する {@link Message Message} の target 文字列を返す。
         *
         * @private
         * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls コントロールまたはその配列
         * @returns {undefined|string|string[]} target 文字列
         */
        private _resolveMessageTarget;
        /**
         * バインドされているプロパティ名を返します。
         *
         * @private
         * @param {sap.ui.core.Control} oControl
         * @returns {string|undefined} バインドされているプロパティ名
         */
        private _resolveBindingPropertyName;
        /**
         * oControl の値が空か判定する。
         *
         * @private
         * @param {sap.ui.core.Control} oControl 検証対象のコントロール
         * @returns {boolean} true: 値が空, false: 値が空でない
         */
        private _isNullValue;
        /**
         * 必須エラーメッセージを返す。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         * @returns {string} 必須エラーメッセージ
         */
        private _getRequiredErrorMessageTextByControl;
        /**
         * リソースバンドルからテキストを取得して返す。リソースバンドルが設定されていない場合は sDefaultText を返す。
         *
         * @private
         * @param {string} sKey キー
         * @param {string} sDefaultText デフォルトのテキスト
         * @returns {string} テキスト
         */
        private _getResourceText;
        /**
         * oControl のラベルテキストを返す。
         *
         * @private
         * @param {sap.ui.core.Control} oControl コントロール
         * @returns {string|undefined} ラベルテキスト。ラベルが見つからない場合は undefined
         */
        private _getLabelText;
        /**
         * {@link sap.ui.core.message.MessageManager MessageManager} にメッセージを追加する。
         *
         * @private
         * @param {sap.ui.core.Control|sap.ui.core.Control[]} oControlOrAControls 検証エラーとなったコントロール
         * @param {string} sMessageText エラーメッセージ
         * @param {string} [sValidateFunctionId] {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
         */
        private _addMessage;
        /**
         * {@link sap.ui.core.message.MessageManager MessageManager} にメッセージを追加する。
         *
         * @private
         * @param {Column} oColumn 検証エラーとなった Column
         * @param {string} sMessageText エラーメッセージ
         * @param {string} sValidateFunctionId {@link #registerValidator registerValidator} や {@link #registerRequiredValidator registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
         * @param {string} fullTarget Message#fullTarget
         * @param {string} sAdditionalText Message#additionalText
         */
        private _addMessageByColumn;
        /**
         * 引数のコントロールに {@link sap.ui.core.ValueState ValueState} と ValueStateText をセットする。
         *
         * @private
         * @param {sap.ui.core.Control} oControl セット先のコントロール
         * @param {sap.ui.core.ValueState} oValueState セットするステート
         * @param {string} sText セットするステートテキスト
         */
        private _setValueState;
        /**
         * 本 Validator によりエラーステートをセットされているかを判定する。
         *
         * @private
         * @param {sap.ui.core.Element} oElement エレメント
         * @returns {boolean} true: 本 Validator によりエラーステートをセットされている, false: セットされていない
         */
        private _isSetValueStateError;
        /**
         * 本 Validator によりエラーステートをセットしたとマークする。
         *
         * @private
         * @param {sap.ui.core.Element} oElement エレメント
         */
        private _markSetValueStateError;
        /**
         * 本 Validator によりエラーステートをセットしたとマークしていたのを外す。
         *
         * @private
         * @param {sap.ui.core.Element} oElement エレメント
         */
        private _unmarkSetValueStateError;
    }
    /**
     * 本 Validator で MessageManager からメッセージを削除する際に、
     * 本 Validator で追加したメッセージを型で判別可能とするためのメッセージ。
     *
     * @namespace learnin.ui5.validator.Validator
     */
    class _ValidatorMessage extends Message {
        targets: string[];
        validationErrorControlIds: string[];
        validateFunctionId: string;
        constructor(mParameters: {
            message: string;
            type: MessageType;
            additionalText: string | undefined;
            processor: MessageProcessor;
            target: string | string[] | undefined;
            fullTarget: string;
            validationErrorControlIds: string[];
            validateFunctionId: string;
        });
        /**
         * Returns the targets of this message.
         *
         * @returns {string[]} The message targets; empty array if the message has no targets
         */
        getTargets(): string[];
        /**
         * 検証エラーとなったコントロールのIDを取得する。
         *
         * @returns {string[]} 検証エラーとなったコントロールのID
         */
        getValidationErrorControlIds(): string[];
        /**
         * 検証を行った関数のIDを取得する。
         *
         * @returns {string} 検証を行った関数のID
         */
        getValidateFunctionId(): string;
    }
}
//# sourceMappingURL=Validator.d.ts.map