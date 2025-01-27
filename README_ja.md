# UI5-Validator

[![npm version](https://badge.fury.io/js/@learnin%2Fui5-validator.svg)](https://badge.fury.io/js/@learnin%2Fui5-validator)

`UI5-Validator` は SAPUI5 または OpenUI5 アプリケーション向けのバリデーションライブラリです。

## なぜバリデーションライブラリが必要か？

SAPUI5/OpenUI5（以降、UI5と記述）ではバリデーション機能が提供されており、バリデーション対象コントロールに `constraints` 属性を設定することによりフォーカスアウト時にバリデーションが実行される。  
ただし、この標準バリデーションの仕組みだけでは一般的なアプリケーション開発において必要とされる次のニーズに対応できない。

- 必須入力チェック
- 複数項目間の相関チェック（e.g. 開始日と終了日の前後関係チェック）
- `constraints` で提供されていないルールによるチェック

これらを1つずつ自前で実装することは可能ではあるが、次のようなことを考慮すると、かなりの実装が必要になるし、共通化も必要となる。  
結果として、必要な仕組みを実装済のライブラリを導入するのがベターとなる。

- アクションボタン（e.g. 保存ボタン）を押したタイミングで、標準バリデーションと自前実装によるバリデーションの両方の結果のメッセージを合わせて表示したい
- エラーメッセージの表示の仕方を標準バリデーションと合わせたい
- メッセージの表示順も標準バリデーションと独自バリデーションで離れることなくコントロール毎に表示したい

## 特徴

- **ビューはそのままでOK**: UI5 標準の `required` 属性やメッセージ管理の仕組み[^1] を利用しており、また、 `constraints` 属性による標準バリデーションと共存する仕組みのため、バリデーション対象コントロールに独自の属性やコントロールを追加したりしなくてよい。
- **一括バリデーション**: ビュー丸ごとでもコントロール単位でもバリデーション可能。
- **テーブル内のコントロールにも対応**: `sap.ui.table.Table` や `sap.m.Table` 内のコントロールもバリデーション可能。
- **任意のバリデーションロジックを追加可能**: `UI5-Validator` が提供するのは必須入力バリデーションと任意のバリデーションロジックを管理する仕組み。バリデーションロジックは自由に実装して利用可能。

[^1]: `sap.ui.core.message.MessageManager` を利用。これは SAPUI5/OpenUI5 1.118 で非推奨となり、 `sap.ui.core.Messaging` が推奨となっている、API はあまり変わっていない。

# デモ

[デモ](https://learnin.github.io/ui5-validator/demo/)

# API ドキュメント

[API ドキュメント](https://learnin.github.io/ui5-validator/api/)

# セットアップ

```bash
npm install @learnin/ui5-validator
```

以降の説明では、次のプロジェクトレイアウトを想定する。  
あなたのプロジェクトのレイアウトが異なる場合は、レイアウトに合わせてパスを調整してください。

```
node_modules/
webapp/
	controller/
	view/
	...
	Component.js
	index.html
	manifest.json
package-lock.json
package.json
ui5.yaml
```

`webapp/libs` ディレクトリを作成し、 `node_modules/@learnin/ui5-validator/dist/resources/` 配下のファイルを `libs` の中にコピーする。

`manifest.json` に次のように `sap.ui5.dependencies.libs.learnin.ui5.validator` と `sap.ui5.resourceRoots.learnin.ui5.validator` を追加する。  
また、標準バリデーションを有効にするために、　`sap.ui5.handleValidation` を `true` に設定する。

```json
{
	// ...
	"sap.ui5": {
		// ...,
		"handleValidation": true,
		"dependencies": {
			// ...,
			"libs": {
				// ...,
				"learnin.ui5.validator": {}
			}
		},
		"resourceRoots": {
			"learnin.ui5.validator": "./libs/learnin/ui5/validator/"
		},
		// ...
```

# 使い方

## 基本的な使用方法

ビュー:  
必須入力コントロールは `required` 属性を `true` に設定する。  
型や桁数チェックは `type` および `constraints` 属性で指定する。 `ui5-validator` 独自のものはなく、標準 API を使って指定するだけ。  
cf. https://sdk.openui5.org/topic/07e4b920f5734fd78fdaa236f26236d8

```xml
<mvc:View
	...
	xmlns="sap.m">
	...
	<Label text="{i18n>label.xxx}" labelFor="xxx" required="true" />
	<Input
		id="xxx"
		value="{
			path: '{xxx>/xxx}',
			type: 'sap.ui.model.type.String',
			constraints: {
				maxLength: 10
			}
		}"
		maxLength="10" />
```

または

```xml
<mvc:View
	...
	xmlns="sap.m">
	...
	<Label text="{i18n>label.xxx}" />
	<Input
		value="{
			path: '{xxx>/xxx}',
			type: 'sap.ui.model.type.String',
			constraints: {
				maxLength: 10
			}
		}"
		maxLength="10"
		required="true" />
```

コントローラ:   
[example/webapp/controller/BaseController.js](https://github.com/learnin/ui5-validator/blob/main/example/webapp/controller/BaseController.js) をコピーし、 `extend` するのが簡単[^2]。

[^2]: 同等の処理を実装すれば `BaseController` の利用は必須ではない。

```javascript
sap.ui.define([
	"./BaseController",
	"learnin/ui5/validator/Validator"
], function (BaseController, Validator) {
	"use strict";

	return BaseController.extend("learnin.ui5.validator.example.controller.ValidatorExample", {
		onInit: function () {
			this._validator = new Validator();
		},

		onExit: function () {
			// バリデータにより引数とその配下のコントロールに自動的にアタッチされた関数を削除する。
			this._validator.removeAttachedValidators(this.getView());
		},

		// 保存ボタン押下時の処理
		onSave: function () {
			const oView = this.getView();

			// 1度保存ボタンを押してバリデーションエラーになった場合は、標準のメッセージモデルにエラーメッセージが残っているのでバリデーション前にクリアする。
			this._validator.removeErrors(oView);
			// OData 等の通信エラーがあった場合は、標準のメッセージモデルにエラーメッセージが残っているのでバリデーション前にクリアする。
			this.removeAllTechnicalMessages();

			// 引数とその配下のコントロールに対してバリデーションを実行する。
			// 標準バリデーションによるエラーも拾うため、 hasErrorMessages も確認する。
			if (!this._validator.validate(oView, {isDoConstraintsValidation: true}) || this.hasErrorMessages()) {
				// エラーメッセージダイアログを表示する。
				this.showValidationErrorMessageDialog();
				return;
			}
		}
	});
});
```

## 項目相関バリデーションや任意のロジックによるバリデーションの実装方法

複数項目間の相関バリデーションや `constraints` にない任意のロジックによるバリデーションを実装するには、  
バリデーション関数を実装し、バリデーション実行までに `registerValidator` メソッド[^3] を呼び、バリデーション関数を渡しておく。  
これにより、 `Validator` に関数が登録され、 `validate` メソッド呼び出し時に登録した関数が実行される。

[^3]: 必須入力バリデーションを実装する場合は `registerRequiredValidator` メソッドを利用する方が簡単。

### 例1. 開始日・終了日の前後関係バリデーション

ビュー:

```xml
<mvc:View
	...
	xmlns="sap.m">
	...
	<Label text="{i18n>label.fromDate}" />
	<DatePicker
		id="fromDate"
		value="{
			path: '{xxx>/fromDate}',
			type: 'sap.ui.model.type.Date'
		}"
		valueFormat="yyyy-MM-dd"
		displayFormat="yyyy/MM/dd"
		required="true" />
	<Label text="{i18n>label.toDate}" />
	<DatePicker
		id="toDate"
		value="{
			path: '{xxx>/toDate}',
			type: 'sap.ui.model.type.Date'
		}"
		valueFormat="yyyy-MM-dd"
		displayFormat="yyyy/MM/dd"
		required="true" />
```

コントローラ:

```javascript
// onInit で this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); しておく。
_onRouteMatched: function () {
	const oView = this.getView();

	// 必須入力チェック以外のバリデーションは、UI5標準バリデーションと同様にフォーカスアウト時にエラー表示させる。
	this._validator.registerValidator(
		// 第2引数の関数を識別するためのID。Validator インスタンス内で一意な文字列とすること。
		"validateFromToDate",
		// バリデーション関数を渡す。OKなら true をNGなら false を返すこと。関数には第4引数で渡すコントロール配列が渡される。
		([oFromDate, oToDate]) => {
			const dFromDateValue = oFromDate.getDateValue();
			const dToDateValue = oToDate.getDateValue();
			// 必須チェックは別でやっているのでここでエラーにするのは両方入力されていて値が不正な場合のみ
			return !(dFromDateValue && dToDateValue && dFromDateValue.getTime() > dToDateValue.getTime());
		},
		// バリデーションエラー時に表示するメッセージまたはメッセージの配列
		[
			this.getResourceText("message.dateBeforeDate", this.getResourceText("label.fromDate"), this.getResourceText("label.toDate")),
			this.getResourceText("message.dateAfterDate", this.getResourceText("label.toDate"), this.getResourceText("label.fromDate"))
		],
		// バリデーション対象のコントロールまたはコントロールの配列
		[oView.byId("fromDate"), oView.byId("toDate")],
		// ここで渡すコントロールのバリデーションの後に、第2引数の関数が実行される。これにより、エラーメッセージの表示順序を制御できる
		oView.byId("toDate")
	);
}
```

### 例2. 1つ以上選択必須なチェックボックスのバリデーション

ビュー:

```xml
<mvc:View
	...
	xmlns="sap.m">
	...
	<Label text="{i18n>label.checkBox}" labelFor="xxx" required="true" />
	<HBox id="xxx" items="{xxx>/items}">
		<CheckBox text="{xxx>text}" />
	</HBox>
```

コントローラ:

```javascript
// onInit で this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); しておく。
_onRouteMatched: function () {
	const oView = this.getView();

	this._validator.registerRequiredValidator(
		// 第2引数の関数を識別するためのID。Validator インスタンス内で一意な文字列とすること。
		"validateRequiredCheckBox",
		// バリデーション関数を渡す。OKなら true をNGなら false を返すこと。関数には第4引数で渡すコントロール配列が渡される。
		(aCheckBoxes) => aCheckBoxes.some(oCheckBox => oCheckBox.getSelected()),
		// バリデーション対象のコントロールまたはコントロールの配列
		oView.byId("xxx").getItems(),
		// ここで渡すコントロールのバリデーションの後に、第2引数の関数が実行される。これにより、エラーメッセージの表示順序を制御できる
		oView.byId("xxx"),
		// オプション
		{
			// true の場合、バリデーション対象を1つのグループとみなして関数の実行は1回だけとなり、エラーメッセージも1つだけとなる。デフォルトは false
			isGroupedTargetControls: true
		}
	);
}
```

## テーブル内のコントロールのバリデーションの実装方法

### 例1. `sap.ui.table.Table` 内の単項目バリデーション

`sap.ui.table.Table` 内の、ある列の値が必須かつ2桁までの入力であることを検証する。

ビュー:

```xml
<mvc:View
	...
	xmlns:table="sap.ui.table">
	...
	<table:Table
		id="gridTable"
		rows="{
			path: 'xxx>/data',
			templateShareable: false
		}">
		<table:Column id="col1InGridTable">
			<Label text="xxx" labelFor="xxx" />
			<table:template>
				<Input id="xxx" value="{xxx>xxx}" required="true" />
			</table:template>
		</table:Column>
	</table:Table>
```

コントローラ:

```javascript
// onInit で this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); しておく。
_onRouteMatched: function () {
	const oView = this.getView();

	this._validator.registerValidator(
		// 第2引数の関数を識別するためのID。Validator インスタンス内で一意な文字列とすること。
		"validateColumnExample1",
		// この引数の関数は、oInputOrValue には
		// フォーカスアウト時は フォーカスアウトした行の　col1InGridTable が渡されて、1度だけ呼び出され、
		// validate メソッド実行時は n行目の col1InGridTable 列の値 が渡されて、 n = 1 から テーブルにバインドされているデータの行数分まで 繰り返し呼び出される。
		(oInputOrValue) => {
			let sValue = oInputOrValue;
			if (oInputOrValue instanceof Input) {
				sValue = oInputOrValue.getValue();
			}
			return !sValue || sValue.length <= 2;
		},
		// バリデーションエラー時に表示するメッセージ
		this.getResourceText("message.enterUpToLetters", "2"),
		// バリデーション対象の Column
		oView.byId("col1InGridTable"),
		// バリデーション対象の Table
		oView.byId("gridTable")
	);
}
```

### 例2. テーブル内の同一列項目間の相関バリデーション

`sap.ui.table.Table` 内の、ある列の値が必須かつ、いずれかの行の値が0であることを検証する。

ビュー:

```xml
<mvc:View
	...
	xmlns:table="sap.ui.table">
	...
	<table:Table
		id="gridTable2"
		rows="{
			path: 'xxx>/data',
			templateShareable: false
		}">
		<table:Column id="col1InGridTable2">
			<Label text="xxx" labelFor="xxx" />
			<table:template>
				<Input id="xxx" value="{xxx>xxx}" required="true" />
			</table:template>
		</table:Column>
	</table:Table>
```

コントローラ:

```javascript
// onInit で this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); しておく。
_onRouteMatched: function () {
	const oView = this.getView();

	this._validator.registerValidator(
		// 第2引数の関数を識別するためのID。Validator インスタンス内で一意な文字列とすること。
		"validateColumnExample2",
		// この引数の関数は、aInputsOrValues には
		// フォーカスアウト時も validate メソッド実行時も [1行目のcol1InGridTable2列の値, 2行目のcol1InGridTable2列の値, ... テーブルにバインドされているデータの行末目のcol1InGridTable2列の値] が渡されて、1度だけ呼び出される。
		(aInputsOrValues) => {
			let aValues = aInputsOrValues;
			if (aInputsOrValues[0] instanceof Input) {
				aValues = aInputsOrValues.map(oInput => oInput.getValue());
			}
			return aValues.some(sValue => sValue === "0");
		},
		// バリデーションエラー時に表示するメッセージ
		this.getResourceText("message.enterEitherLine", "0"),
		// バリデーション対象の Column
		oView.byId("col1InGridTable2"),
		// バリデーション対象の Table
		oView.byId("gridTable2")
		{
			isGroupedTargetControls: true,
			isAttachFocusoutValidationImmediately: false
		}
	);
}
```

### 例3. テーブル内の同一行内の項目相関バリデーション

`sap.ui.table.Table` 内の、ある列の値が必須かつ、別のある列の値が0の場合は、値が1桁であることを検証する。

```xml
<mvc:View
	...
	xmlns:table="sap.ui.table">
	...
	<table:Table
		id="gridTable3"
		rows="{
			path: 'xxx>/data',
			templateShareable: false
		}">
		<table:Column id="col1InGridTable3" label="xxx1">
			<table:template>
				<Input id="xxx1" value="{xxx>xxx1}" />
			</table:template>
		</table:Column>
		<table:Column id="col2InGridTable3">
			<Label text="xxx2" labelFor="xxx2" />
			<table:template>
				<Input id="xxx2" value="{xxx>xxx2}" required="true" />
			</table:template>
		</table:Column>
	</table:Table>
```

コントローラ:

```javascript
// onInit で this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); しておく。
_onRouteMatched: function () {
	const oView = this.getView();

	this._validator.registerValidator(
		// 第2引数の関数を識別するためのID。Validator インスタンス内で一意な文字列とすること。
		"validateColumnExample3",
		// この引数の関数は、aInputsOrValues には
		// フォーカスアウト時は フォーカスアウトした行の　[col1InGridTable3, col2InGridTable3] が渡されて、1度だけ呼び出され、
		// validate メソッド実行時は [n行目のcol1InGridTable3列の値, n行目のcol2InGridTable3列の値] が渡されて、 n = 1 から テーブルにバインドされているデータの行数分まで 繰り返し呼び出される。
		(aInputsOrValues) => {
			let aValues = aInputsOrValues;
			if (aInputsOrValues[0] instanceof Input) {
				aValues = aInputsOrValues.map(oInput => oInput.getValue());
			}
			return !(aValues[0] === "0" && aValues[1].length > 1);
		},
		// バリデーションエラー時に表示するメッセージ
		this.getResourceText("message.col1Andcol2InGridTable3ValidationError", "label.xxx1", "0", "label.xxx2", "1"),
		// バリデーション対象の Column の配列
		[oView.byId("col1InGridTable3"), oView.byId("col2InGridTable3")],
		// バリデーション対象の Table
		oView.byId("gridTable3")
	);
}
```

## `Validator` コンストラクタ引数について


# ライセンス

このプロジェクトは [Apache-2.0 License](https://github.com/learnin/ui5-validator/blob/main/LICENSE.txt) の下でライセンスされている。
