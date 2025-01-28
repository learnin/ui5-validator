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
    /**
     * 検証対象のコントロールもしくはそれを含むコンテナ
     */
    type ValidateTargetControlOrContainer = Control | FormContainer | FormElement | IconTabFilter;
    /**
     * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} メソッドのオプション引数の型
     */
    type OptionParameterOfRegisterValidator = {
        /**
         * {@link Validator#validate | validate} 実行時にバリデーション対象コントロールのフォーカスアウトイベントにバリデータ関数をアタッチするか
         *
         * @remarks
         * デフォルトは true
         */
        isAttachValidator: boolean;
        /**
         * 直ちにバリデーション対象コントロールのフォーカスアウトイベントにバリデーション関数をアタッチするか
         *
         * @remarks
         * デフォルトは registerValidator の場合は true, registerRequiredValidator の場合は false。\
         * isAttachValidator = false の場合、 true にすると SyntaxError がスローされる。
         */
        isAttachFocusoutValidationImmediately: boolean;
        /**
         * バリデーション対象を1つのグループとみなすか
         *
         * @remarks
         * true の場合、バリデーション対象を1つのグループとみなして関数の実行は1回だけとなり、エラーメッセージも1つだけとなる。\
         * エラーステートは対象の全部のコントロールにつくかつかないか（一部だけつくことはない）。\
         * デフォルトは false
         */
        isGroupedTargetControls: boolean;
        /**
         * バリデーション関数を追加でフォーカスアウトイベントにアタッチするコントロールまたはコントロールの配列
         *
         * @remarks
         * バリデーション対象が配列の場合、true にすると SyntaxError がスローされる。
         */
        controlsMoreAttachValidator: Control | Control[];
    };
    /**
     * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} メソッドの引数のバリデーション関数の型
     *
     * @param oTargetControlOrAControlsOrValueOrValues - 検証対象のコントロールまたはその配列、または検証対象のテーブル列の値またはその配列
     * @returns true: valid、false: invalid
     */
    type ValidateFunction = (oTargetControlOrAControlsOrValueOrValues: any) => boolean;
    /**
     * {@link Validator#validate | validate} メソッドのオプション引数の型
     */
    type ValidateOption = {
        /**
         * UI5 標準の constraints バリデーションも実行するか
         *
         * @remarks
         * デフォルトは false
         */
        isDoConstraintsValidation: boolean;
    };
    type ValidatorInfo = {
        validateFunctionId: string;
        testFunction: ValidateFunction;
        messageTextOrMessageTexts: string | string[];
        targetControlOrControls: Control | Control[];
        validateFunction: (oValidatorInfo: ValidatorInfo) => boolean;
        isGroupedTargetControls: boolean;
        controlsMoreAttachValidator: Control | Control[];
        isOriginalFunctionIdUndefined: boolean;
        isAttachValidator: boolean;
    };
    /**
     * スクロールイベントハンドラ等、頻繁に実行されるイベントを間引くためのラッパー
     *
     * @param thisArg - this 参照
     * @param fn - イベントハンドラ
     * @param delay - 遅延ミリ秒。最後に発生したイベントからこの期間を経過すると実行される
     * @returns イベントハンドラ
     */
    const debounceEventHandler: (thisArg: object, fn: Function, delay: number) => (oEvent: Event) => void;
    /**
     * T | T[] 型を T[] 型へ変換する
     *
     * @param valueOrValues - 値または値の配列
     * @returns 引数が配列だった場合は引数そのまま、そうでない場合は引数を配列に入れたもの
     */
    const toArray: <T>(valueOrValues: T | T[]) => T[];
    /**
     * 引数が Column | Coulumn[] 型であることをアサーションするユーザ定義型ガード
     *
     * @param value - アサーション対象
     */
    const assertColumnOrColumns: (value: any) => asserts value is Column | Column[];
    /**
     * バリデータクラス
     */
    export default class Validator extends BaseObject {
        /**
         * 入力コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
         *
         * @remarks
         * デフォルトのメッセージを変更したい場合は、コンストラクタ引数の resourceBundle にこのプロパティキーを定義したメッセージリソースバンドルを渡してください。
         */
        RESOURCE_BUNDLE_KEY_REQUIRED_INPUT: string;
        /**
         * 選択コントロールの必須バリデーションエラーメッセージのリソースバンドルキー
         *
         * @remarks
         * デフォルトのメッセージを変更したい場合は、コンストラクタ引数の resourceBundle にこのプロパティキーを定義したメッセージリソースバンドルを渡してください。
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
        constructor(mParameter?: {
            resourceBundle: ResourceBundle;
            targetAggregations: string | string[];
            useFocusoutValidation: boolean;
        });
        /**
         * 引数のオブジェクトもしくはその配下のコントロールのバリデーションを行う。
         *
         * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
         * @param option - オプション
         * @returns true: valid, false: invalid
         *
         * @public
         */
        validate(oTargetRootControl: ValidateTargetControlOrContainer, option?: ValidateOption): boolean;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスにより追加されたメッセージを
         * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} から除去する。
         * その結果、該当コントロールにメッセージがなくなった場合は、{@link https://sdk.openui5.org/api/sap.ui.core.ValueState | ValueState} もクリアする。
         *
         * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
         *
         * @public
         */
        removeErrors(oTargetRootControl: ValidateTargetControlOrContainer): void;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールについて、本クラスによりアタッチされた関数をデタッチする。
         *
         * @param oTargetRootControl - 対象のコントロールもしくはそれを含むコンテナ
         *
         * @public
         */
        removeAttachedValidators(oTargetRootControl: ValidateTargetControlOrContainer): void;
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
        registerValidator(sValidateFunctionId: string, fnTest: ValidateFunction, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        registerValidator(fnTest: ValidateFunction, sMessageTextOrAMessageTexts: string | string[], oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        private _registerValidator;
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
        registerRequiredValidator(sValidateFunctionId: string, fnTest: ValidateFunction, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        registerRequiredValidator(fnTest: ValidateFunction, oTargetControlOrAControls: Control | Control[], oControlValidateBefore: Control, mParameter?: OptionParameterOfRegisterValidator): Validator;
        private _registerRequiredValidator;
        /**
         * {@link Validator#registerValidator | registerValidator}, {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されている関数を登録解除する。
         *
         * @param sValidateFunctionId - registerValidator, registerRequiredValidator メソッドの引数で渡した sValidateFunctionId
         * @param oControlValidateBefore - registerValidator, registerRequiredValidator メソッドの引数で渡した oControlValidateBefore
         * @returns Reference to this in order to allow method chaining
         *
         * @public
         */
        unregisterValidator(sValidateFunctionId: string, oControlValidateBefore: Control): Validator;
        /**
         * 引数のオブジェクトもしくはその配下のコントロールにバリデータ関数をアタッチする。
         *
         * @param oTargetRootControl - バリデータ関数をアタッチするコントロールもしくはそれを含むコンテナ
         */
        private _attachValidator;
        /**
         * 引数のオブジェクトとその配下のコントロールのバリデーションを行う。
         *
         * @param oTargetRootControl - 検証対象のコントロールもしくはそれを含むコンテナ
         * @param isDoConstraintsValidation - UI5 標準の constraints バリデーションも実行するか
         * @returns true: valid, false: invalid
         */
        private _validate;
        /**
         * sap.ui.table.Table#indexOfColumn や #getColumns で使う非表示列を含む列インデックス値から
         * sap.ui.table.Row#indexOfCell や #getCells で使う非表示列を除いた列インデックス値へ変換する
         *
         * @param oSapUiTableTable - テーブルコントロール
         * @param aColumnIndiciesOrIColumnIndex - 非表示列を含む列インデックス値
         * @returns 非表示列を除いた列インデックス値
         */
        private _toVisibledColumnIndex;
        /**
         * sap.ui.table.Table#rowsUpdated イベント用のハンドラ
         * テーブルの画面に表示されている行について、ValueState, ValueText を最新化する。
         *
         * @param oEvent - イベント
         */
        private _renewValueStateInTable;
        /**
         * sap.ui.table.Table#sort や #filter, #modelContextChange イベント用のハンドラ
         * これらのイベントが発生した場合は this._mInvalidTableRowCols に保持しているバリデーションエラーの行インデックスとテーブルのデータの行が合わなくなってしまうため
         * this._mInvalidTableRowCols に保持しているエラー行・列情報をクリアする。
         *
         * @param oEvent - イベント
         */
        private _clearInValidRowColsInTable;
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
        private _addMessageAndInvalidTableRowCol;
        /**
         * sap.ui.table.Table のスクロール時に、テーブル上のコントロールの ValueState, ValueText を最新化させるためのイベントハンドラをアタッチする。
         *
         * @param oTable - テーブル
         */
        private _attachTableRowsUpdater;
        /**
         * oControl のバリデーションの直後に実行するように登録済のバリデータ関数を呼び出す。
         *
         * @param oControl - コントロール
         * @returns true: valid, false: invalid
         */
        private _callRegisteredValidator;
        /**
         * oControl に必須チェック用フォーカスアウトバリデータをアタッチする。
         *
         * @param oControl - コントロール
         */
        private _attachNotRegisteredValidator;
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
        private _attachRegisteredValidator;
        /**
         * フォーカスアウトバリデータをアタッチ済みかどうかを返す。
         *
         * @param sControlId - コントロールID
         * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         * @returns true: フォーカスアウトバリデータをアタッチ済み, false: フォーカスアウトバリデータをアタッチ済みでない
         */
        private _isAttachedValidator;
        /**
         * フォーカスアウトバリデータをアタッチする。
         *
         * @param oControl - コントロール
         * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         * @param oData - アタッチする関数に渡すデータ
         */
        private _internalAttachValidator;
        /**
         * oControl の、本 Validator によりアタッチされているフォーカスアウトバリデータをデタッチする。
         *
         * @param oControl - コントロール
         */
        private _detachAllValidators;
        /**
         * 必須チェック用フォーカスアウトバリデータ関数
         *
         * @param oEvent - イベント
         * @param sMessageText - エラーメッセージ
         */
        private _notRegisteredValidator;
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
        private _registeredvalidator;
        /**
         * oControl が JSONModel がバインドされた sap.ui.table.Table 内のセルかどうかを返します。
         *
         * @param oControl - コントロール
         * @returns true: JSONModel がバインドされた sap.ui.table.Table 内のセル, false: それ以外
         */
        private _isCellInSapUiTableTableBindedJsonModel;
        /**
         * sap.ui.table.Table 内のセルについて、バリデーションエラー行・列情報への登録と、MessageModel への登録と ValueState/ValueText のセットを行います。
         *
         * @param oControlOrAControls - sap.ui.table.Table 内のセル
         * @param sMessageText - メッセージ
         * @param sValidateFunctionId - registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
         * @param isGroupedTargetControls
         */
        private _setErrorCellInSapUiTableTable;
        /**
         * sap.ui.table.Table 内のセルについて、保持しているバリデーションエラー行・列情報をクリアし、MessageModel からの削除と ValueState/ValueText のクリアを行います。
         *
         * @param oControlOrAControls - sap.ui.table.Table 内のセル
         * @param sValidateFunctionId - registerValidator/registerRequiredValidator で登録したバリデータ関数のID、デフォルトの必須バリデータの場合は ""
         * @param isGroupedTargetControls
         */
        private _clearErrorCellInSapUiTableTable;
        /**
         * 引数のコントロールの必須チェックを行う。
         *
         * @param oControl - 検証対象のコントロール
         * @returns true: valid、false: invalid
         */
        private _validateRequired;
        /**
         * sap.ui.table.Table の required な列について、テーブルにバインドされているデータ全行に対して必須チェックを行う。
         *
         * @param oTable - 検証対象のテーブル
         * @returns true: バリデーションOK, false: バリデーションNG
         */
        private _validateRequiredInSapUiTableTable;
        /**
         * メッセージを除去し、oControl に他にエラーがなければエラーステートをクリアする。
         *
         * @param oControl - 対象のコントロール
         * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は ""
         */
        private _removeMessageAndValueState;
        /**
         * 不正な値を入力された場合、UI5標準のバリデーション(sap.ui.model.type.XXX の constraints によるバリデーション)によりエラーステートがセットされている可能性があるため、
         * 該当のコントロールにエラーメッセージがまだあるか確認し、ない場合にのみエラーステートをクリアする。
         *
         * @param oControl - 処理対象のコントロール
         * @param sTargetOrATargets - セットされているメッセージの中から対象のコントロールのメッセージを判別するための Message の target/targets プロパティ値
         */
        private _clearValueStateIfNoErrors;
        /**
         * oElement が sParentControlId のコントロール自身もしくはその子供かどうか判定する。
         *
         * @param oElement - 判定対象のコントロール
         * @param sParentControlId - 親コントロールID
         * @returns true: 親コントロール自身かその子供, false: 親コントロールでもその子供でもない
         */
        private _isChildOrEqualControlId;
        /**
         * oControlOrAControls に対応する {@link https://sdk.openui5.org/api/sap.ui.core.message.Message | Message} の target 文字列を返す。
         *
         * @param oControlOrAControls - コントロールまたはその配列
         * @returns target 文字列
         */
        private _resolveMessageTarget;
        /**
         * バインドされているプロパティ名を返します。
         *
         * @param oControl
         * @returns バインドされているプロパティ名
         */
        private _resolveBindingPropertyName;
        /**
         * oControl の値が空か判定する。
         *
         * @param oControl - 検証対象のコントロール
         * @returns true: 値が空, false: 値が空でない
         */
        private _isNullValue;
        /**
         * 必須エラーメッセージを返す。
         *
         * @param oControl - コントロール
         * @returns 必須エラーメッセージ
         */
        private _getRequiredErrorMessageTextByControl;
        /**
         * リソースバンドルからテキストを取得して返す。リソースバンドルが設定されていない場合は sDefaultText を返す。
         *
         * @param sKey - キー
         * @param sDefaultText - デフォルトのテキスト
         * @returns テキスト
         */
        private _getResourceText;
        /**
         * oControl のラベルテキストを返す。
         *
         * @param oControl - コントロール
         * @returns ラベルテキスト。ラベルが見つからない場合は undefined
         */
        private _getLabelText;
        /**
         * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} にメッセージを追加する。
         *
         * @param oControlOrAControls - 検証エラーとなったコントロール
         * @param sMessageText - エラーメッセージ
         * @param [sValidateFunctionId] - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
         */
        private _addMessage;
        /**
         * {@link https://sdk.openui5.org/api/sap.ui.core.message.MessageManager | MessageManager} にメッセージを追加する。
         *
         * @param oColumn - 検証エラーとなった Column
         * @param sMessageText - エラーメッセージ
         * @param sValidateFunctionId - {@link Validator#registerValidator | registerValidator} や {@link Validator#registerRequiredValidator | registerRequiredValidator} で登録されたバリデータ関数のID。デフォルトの必須バリデータの場合は "" or undefined
         * @param fullTarget - Message#fullTarget
         * @param sAdditionalText - Message#additionalText
         */
        private _addMessageByColumn;
        /**
         * 引数のコントロールに {@link https://sdk.openui5.org/api/sap.ui.core.ValueState | ValueState} と ValueStateText をセットする。
         *
         * @param oControl - セット先のコントロール
         * @param oValueState - セットするステート
         * @param sText - セットするステートテキスト
         */
        private _setValueState;
        /**
         * 本 Validator によりエラーステートをセットされているかを判定する。
         *
         * @param oElement - エレメント
         * @returns true: 本 Validator によりエラーステートをセットされている, false: セットされていない
         */
        private _isSetValueStateError;
        /**
         * 本 Validator によりエラーステートをセットしたとマークする。
         *
         * @param oElement - エレメント
         */
        private _markSetValueStateError;
        /**
         * 本 Validator によりエラーステートをセットしたとマークしていたのを外す。
         *
         * @param oElement - エレメント
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
         * @returns The message targets; empty array if the message has no targets
         */
        getTargets(): string[];
        /**
         * 検証エラーとなったコントロールのIDを取得する。
         *
         * @returns 検証エラーとなったコントロールのID
         */
        getValidationErrorControlIds(): string[];
        /**
         * 検証を行った関数のIDを取得する。
         *
         * @returns 検証を行った関数のID
         */
        getValidateFunctionId(): string;
    }
}
//# sourceMappingURL=Validator.d.ts.map