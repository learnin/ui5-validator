# UI5-Validator

> [**日本語**](README_ja.md)

[![npm version](https://badge.fury.io/js/@learnin%2Fui5-validator.svg)](https://badge.fury.io/js/@learnin%2Fui5-validator)

Validation library for OpenUI5 or SAPUI5 applications.  

It uses the SAPUI5/OpenUI5 (hereafter referred to as UI5) standard `required` attribute and message management mechanism[^1] and coexists with standard validation by `constraints` attribute, so there is no need to add your own attributes or controls to the control to be validated.  
The `UI5-Validator` provides a mechanism to manage required input validation and any validation logic, and you are free to implement and use your own validation logic.

[^1]: This uses `sap.ui.core.message. MessageManager`. This is deprecated in SAPUI5/OpenUI5 1.118, and `sap.ui.core.Messaging` is recommended. The API has not changed much.

## Features

- Required validation with the UI5 standard `required` attribute.
- Can be run in conjunction with standard UI5 `constraints`.
- Implement and use any validation logic, including single-item validation and multiple-item correlation validation etc.
- Any validation logic can be executed on focus-out, similar to the UI5 standard `constraints`.
- Validations can be performed on the whole view or on a per-control basis
- Controls in `sap.ui.table.Table` and `sap.m.Table` can also be validated.

## Demo

[demo](https://learnin.github.io/ui5-validator/demo/)

See [example](example) for the source code of the demo.

## API Document

[API Document](https://learnin.github.io/ui5-validator/api/en/)

## Why do you need a validation library?

UI5 provides a validation mechanism, whereby the `constraints` attribute can be set on a control to be validated, and validation will be performed when the focus is out.  
However, this standard validation mechanism alone cannot meet the following needs for general application development.

- Required validation
- Correlation validation between multiple items (e.g., check for pre- and post-relationships between start and end dates)
- Checking by rules not provided in `constraints`

Although it is possible to implement these one by one by oneself, a considerable amount of implementation and commonality is required considering the following.  
As a result, I believe it is realistic to introduce libraries that have already implemented the necessary mechanisms.

- We want to display a message with the results of both the UI5 standard validation and the my own validation at the same time when the action button (e.g. save button) is pressed.
- We want to match the way error messages are displayed with UI5 standard validation.
- We want to display the order of messages by control without leaving the UI5 standard validation and my own validation.

## Setup

```bash
npm install @learnin/ui5-validator
```

The following project layouts are assumed in the following instructions.  
If your project layout is different, adjust the paths to fit your layout.

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

Create `webapp/libs` directory and copy files under `node_modules/@learnin/ui5-validator/dist/resources/` into `libs`.

Add `sap.ui5.dependencies.libs.learnin.ui5.validator` and `sap.ui5.resourceRoots.learnin.ui5.validator` to `manifest.json` as follows.  
Also, set `sap.ui5.handleValidation` to `true` to enable UI5 standard validation.

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

## Usage

### Basic Usage

View:  
Required input controls set the `required` attribute to `true`.  
Type and digit checks are specified by `type` and `constraints` attributes. There is no `UI5-Validator` of its own, just use the UI5 standard API to specify it.  
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

or

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

Controller:   
Easy to copy [example/webapp/controller/BaseController.js](https://github.com/learnin/ui5-validator/blob/main/example/webapp/controller/BaseController.js) and `extend` [^2]。

[^2]: The use of `BaseController` is not mandatory if an equivalent process is implemented.

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
            // Remove functions that are automatically attached to an argument and its subordinate controls by a validator.
            this._validator.removeAttachedValidators(this.getView());
        },

        // Processing when the Save button is pressed.
        onSave: function () {
            const oView = this.getView();

            // If the save button is pressed once and a validation error occurs,
            // the error message remains in the UI5 standard message model and is cleared before validation.
            this._validator.removeErrors(oView);
            // If there is a communication error such as OData, the error message remains in the UI5 standard message model
            // and should be cleared before validation.
            this.removeAllTechnicalMessages();

            // Validation is performed on arguments and their subordinate controls.
            // Also check hasErrorMessages to pick up errors due to UI5 standard validation.
            if (!this._validator.validate(oView, {isDoConstraintsValidation: true}) || this.hasErrorMessages()) {
                // Display error message dialog.
                this.showValidationErrorMessageDialog();
                return;
            }
        }
    });
});
```

### How to implement item correlation validation or validation with custom logic

To implement correlation validation between multiple items, or validation with any logic that is not in the `constraints`,  
Implement a validation function, and call the `registerValidator` method[^3] and pass the validation function before executing the validation.  
This will register the function in the `Validator`, and the registered function will be executed when the `validate` method is called.

[^3]: It is easier to use the `registerRequiredValidator` method to implement required input validation.

#### Example 1: Pre- and post-relationship validation of start and end dates

View:

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

Controller:

```javascript
// this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); in the onInit method.
_onRouteMatched: function () {
    const oView = this.getView();

    // Validations other than required input checks should be displayed as errors on focus out as in the UI5 standard validation.
    this._validator.registerValidator(
        // ID to identify the function of the second argument, which should be a string unique within the Validator instance.
        "validateFromToDate",
        // Pass a validation function, which should return true if OK and false if NG.
        // The function is passed the control array passed as the fourth argument.
        ([oFromDate, oToDate]) => {
            const dFromDateValue = oFromDate.getDateValue();
            const dToDateValue = oToDate.getDateValue();
            // Required checks are done separately, so the only error here is if both are entered and the value is invalid.
            return !(dFromDateValue && dToDateValue && dFromDateValue.getTime() > dToDateValue.getTime());
        },
        // Message or array of messages to display in case of validation errors
        [
            this.getResourceText("message.dateBeforeDate", this.getResourceText("label.fromDate"), this.getResourceText("label.toDate")),
            this.getResourceText("message.dateAfterDate", this.getResourceText("label.toDate"), this.getResourceText("label.fromDate"))
        ],
        // Control or array of controls to be validated
        [oView.byId("fromDate"), oView.byId("toDate")],
        // The function of the second argument is executed after the validation of the control passed here.
        // This allows control over the order in which error messages are displayed
        oView.byId("toDate")
    );
}
```

#### Example 2: Validation of one or more checkboxes that must be selected

View:

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

Controller:

```javascript
// this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); in the onInit method.
_onRouteMatched: function () {
    const oView = this.getView();

    this._validator.registerRequiredValidator(
        // ID to identify the function of the second argument, which should be a string unique within the Validator instance.
        "validateRequiredCheckBox",
        // Pass a validation function, which should return true if OK and false if NG.
        // The function is passed the control array passed as the fourth argument.
        (aCheckBoxes) => aCheckBoxes.some(oCheckBox => oCheckBox.getSelected()),
        // Control or array of controls to be validated
        oView.byId("xxx").getItems(),
        // The function of the second argument is executed after the validation of the control passed here.
        // This allows control over the order in which error messages are displayed
        oView.byId("xxx"),
        // Optional parameter
        {
            // If true, the function is considered to be a single group to be validated,
            // and the function is executed only once, with only one error message.
            isGroupedTargetControls: true
        }
    );
}
```

### How to implement validation of controls in a table

#### Example 1: single-item validation in `sap.ui.table.Table`

Validate that the value of a column in a `sap.ui.table.Table` is a required and up to two-digit input.

View:

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

Controller:

```javascript
// this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); in the onInit method.
_onRouteMatched: function () {
    const oView = this.getView();

    this._validator.registerValidator(
        // ID to identify the function of the second argument, which should be a string unique within the Validator instance.
        "validateColumnExample1",
        // When the focus is out, oInputOrValue is passed the col1InGridTable of the row that is out of focus and is called only once;
        // when the validate method is executed, the value of the col1InGridTable column in row n is passed
        // and the function is called repeatedly from n = 1 until the number of rows of data bound to the table.
        (oInputOrValue) => {
            let sValue = oInputOrValue;
            if (oInputOrValue instanceof Input) {
                sValue = oInputOrValue.getValue();
            }
            return !sValue || sValue.length <= 2;
        },
        // Message to display in case of validation errors
        this.getResourceText("message.enterUpToLetters", "2"),
        // Columns to be validated
        oView.byId("col1InGridTable"),
        // Table to be validated
        oView.byId("gridTable")
    );
}
```

#### Example 2: correlation validation between the same column items in a table

Validate that a column in the `sap.ui.table.Table` has a required value and that one of the rows has a value of 0.

View:

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

Controller:

```javascript
// this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); in the onInit method.
_onRouteMatched: function () {
    const oView = this.getView();

    this._validator.registerValidator(
        // ID to identify the function of the second argument, which should be a string unique within the Validator instance.
        "validateColumnExample2",
        // The function for this argument is called only once, with aInputsOrValues being passed
        // [the value of col1InGridTable2 column in row 1, the value of col1InGridTable2 column in row 2, ... the value of the col1InGridTable2 column at the end of the row of data bound to the table]
        // both at focus out and when the validate method is executed.
        (aInputsOrValues) => {
            let aValues = aInputsOrValues;
            if (aInputsOrValues[0] instanceof Input) {
                aValues = aInputsOrValues.map(oInput => oInput.getValue());
            }
            return aValues.some(sValue => sValue === "0");
        },
        // Message to display in case of validation errors
        this.getResourceText("message.enterEitherLine", "0"),
        // Columns to be validated
        oView.byId("col1InGridTable2"),
        // Table to be validated
        oView.byId("gridTable2")
        {
            isGroupedTargetControls: true,
            isAttachFocusoutValidationImmediately: false
        }
    );
}
```

#### Example 3: item correlation validation within the same row in a table

If the value of one column in the `sap.ui.table.Table` is required and the value of another column is 0, the value is validated to be one-digit.

View:

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

Controller:

```javascript
// this.getRouter().getRoute("xxx").attachMatched(this._onRouteMatched, this); in the onInit method.
_onRouteMatched: function () {
    const oView = this.getView();

    this._validator.registerValidator(
        // ID to identify the function of the second argument, which should be a string unique within the Validator instance.
        "validateColumnExample3",
        // When the focus is out, aInputsOrValues is passed the [col1InGridTable3, col2InGridTable3] of the row that is out of focus and is called only once;
        // when the validate method is executed, the value of the [col1InGridTable3 column in row n, col2InGridTable3 column in row n] is passed
        // and the function is called repeatedly from n = 1 until the number of rows of data bound to the table.
        (aInputsOrValues) => {
            let aValues = aInputsOrValues;
            if (aInputsOrValues[0] instanceof Input) {
                aValues = aInputsOrValues.map(oInput => oInput.getValue());
            }
            return !(aValues[0] === "0" && aValues[1].length > 1);
        },
        // Message to display in case of validation errors
        this.getResourceText("message.col1Andcol2InGridTable3ValidationError", "label.xxx1", "0", "label.xxx2", "1"),
        // Array of Columns to be validated
        [oView.byId("col1InGridTable3"), oView.byId("col2InGridTable3")],
        // Table to be validated
        oView.byId("gridTable3")
    );
}
```

## License

[Apache-2.0 License](https://github.com/learnin/ui5-validator/blob/main/LICENSE.txt) © 2021-Present Manabu Inoue
