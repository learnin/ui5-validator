//@ui5-bundle learnin/ui5/validator/library-preload.js
/*!
 * ${copyright}
 */
sap.ui.predefine("learnin/ui5/validator/library", ["sap/ui/core/library"],()=>{"use strict";return sap.ui.getCore().initLibrary({name:"learnin.ui5.validator",version:"0.3.1",dependencies:["sap.ui.core","sap.m"],types:[],interfaces:[],controls:["learnin.ui5.validator.Validator"],elements:[],noLibraryCSS:true})});
sap.ui.require.preload({
	"learnin/ui5/validator/SapMTableUtil.js":function(){
"use strict";sap.ui.define(["sap/m/Table"],function(e){class t{static getLabelText(t,n){const i=n.getParent();if(i instanceof e){const e=n.indexOfCell(t);if(e!==-1){const t=i.getColumns().filter(e=>e.getVisible())[e].getHeader();if("getText"in t&&typeof t.getText==="function"){return t.getText()}}}return undefined}}return t});
},
	"learnin/ui5/validator/Validator.js":function(){
"use strict";sap.ui.define(["sap/base/util/deepExtend","sap/base/util/uid","sap/m/CheckBox","sap/m/ColumnListItem","sap/m/IconTabFilter","sap/m/Input","sap/ui/base/Object","sap/ui/core/Control","sap/ui/core/Element","sap/ui/core/LabelEnablement","sap/ui/core/library","sap/ui/core/message/ControlMessageProcessor","sap/ui/core/message/Message","sap/ui/model/json/JSONModel","sap/ui/layout/form/FormContainer","sap/ui/layout/form/FormElement","sap/ui/table/Column","sap/ui/table/Row","sap/ui/table/Table","sap/ui/model/ListBinding","./SapMTableUtil"],function(e,t,n,i,a,s,r,o,l,d,g,c,u,f,h,_,I,T,C,V,p){function A(e){return e&&e.__esModule&&typeof e.default!=="undefined"?e.default:e}const m=l["registry"];const y=g["MessageType"];const E=g["ValueState"];const S=A(p);const R=(t,n,i)=>{let a;return s=>{if(a){clearTimeout(a)}const r=e({},s);a=setTimeout(()=>n.call(t,r),i)}};const b=e=>{if(Array.isArray(e)){return e}return[e]};const M=e=>{if(e===null||e===undefined){throw new SyntaxError("Argument is not a Column or Columns.")}const t=b(e);if(t.some(e=>!(e instanceof I))){throw new SyntaxError("Argument is neither a Column nor Columns.")}};const x=r.extend("learnin.ui5.validator.Validator",{constructor:function e(t){r.prototype.constructor.call(this);this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT="learnin.ui5.validator.Validator.message.requiredInput";this.RESOURCE_BUNDLE_KEY_REQUIRED_SELECT="learnin.ui5.validator.Validator.message.requiredSelect";this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR="learnin.ui5.validator.Validator.IS_SET_VALUE_STATE_ERROR";this._aTargetAggregations=["items","content","form","formContainers","formElements","fields","sections","subSections","app","pages","_grid","_page","cells"];this._mInvalidTableRowCols=new Map;this._mRegisteredValidator=new Map;this._mControlIdAttachedValidator=new Map;this._sTableIdAttachedRowsUpdated=new Set;this._fnDebouncedRenewValueStateInTable=null;if(t&&t.resourceBundle){this._resourceBundle=t.resourceBundle}if(t&&t.targetAggregations){if(Array.isArray(t.targetAggregations)){t.targetAggregations.forEach(e=>{if(!this._aTargetAggregations.includes(e)){this._aTargetAggregations.push(e)}})}else{if(!this._aTargetAggregations.includes(t.targetAggregations)){this._aTargetAggregations.push(t.targetAggregations)}}}this._useFocusoutValidation=true;if(t&&t.useFocusoutValidation===false){this._useFocusoutValidation=false}},validate:function e(t){if(this._useFocusoutValidation){this._attachValidator(t)}return this._validate(t)},removeErrors:function e(t){if(!t){throw new SyntaxError}if(!(t instanceof o)&&!(t instanceof h)&&!(t instanceof _)&&!(t instanceof a)){return}const n=sap.ui.getCore().getMessageManager();const i=n.getMessageModel();const s=w.getMetadata().getName();const l=i.getProperty("/").filter(e=>r.isA(e,s));const d=t.getId();for(let e=0,t=l.length;e<t;e++){const t=l[e];const i=t.getValidationErrorControlIds();if(!i.some(e=>m.get(e))){n.removeMessages(t);continue}i.forEach(e=>{const i=m.get(e);if(this._isChildOrEqualControlId(i,d)){n.removeMessages(t)}})}this._mInvalidTableRowCols.forEach((e,t)=>{const n=m.get(t);if(n&&this._isChildOrEqualControlId(n,d)){this._mInvalidTableRowCols.delete(t)}});m.forEach((e,t)=>{if(e instanceof o&&this._isSetValueStateError(e)&&this._isChildOrEqualControlId(e,d)){this._clearValueStateIfNoErrors(e,this._resolveMessageTarget(e))}})},removeAttachedValidators:function e(t){if(!t){throw new SyntaxError}if(!(t instanceof o)&&!(t instanceof h)&&!(t instanceof _)&&!(t instanceof a)){return}const n=t.getId();this._mControlIdAttachedValidator.forEach((e,t)=>{const i=m.get(t);if(!i||!(i instanceof o)){return}if(this._isChildOrEqualControlId(i,n)){this._detachAllValidators(i)}});this._sTableIdAttachedRowsUpdated.forEach(e=>{const t=m.get(e);if(!t||!(t instanceof C)){return}if(this._isChildOrEqualControlId(t,n)){if(this._fnDebouncedRenewValueStateInTable){t.detachRowsUpdated(this._fnDebouncedRenewValueStateInTable,this)}t.detachSort(this._clearInValidRowColsInTable,this);t.detachFilter(this._clearInValidRowColsInTable,this);t.detachModelContextChange(this._clearInValidRowColsInTable,this);this._sTableIdAttachedRowsUpdated.delete(e)}})},registerValidator:function e(n,i,a,s,r,o){if(typeof n==="string"){return this._registerValidator(false,n,i,a,s,r,o)}return this._registerValidator(true,t(),n,i,a,s,r)},_registerValidator:function e(t,n,i,a,s,r,o){if(!(!Array.isArray(s)&&!Array.isArray(a)||Array.isArray(s)&&!Array.isArray(a)||Array.isArray(s)&&Array.isArray(a)&&a.length==s.length)){throw new SyntaxError}if(Array.isArray(s)&&o&&o.controlsMoreAttachValidator){throw new SyntaxError}if(o&&!o.isAttachValidator&&o.isAttachFocusoutValidationImmediately){throw new SyntaxError}const l={isAttachValidator:true,isAttachFocusoutValidationImmediately:true,isGroupedTargetControls:false,controlsMoreAttachValidator:null};const d=Object.assign({},l,o);let g=false;let c;if(!Array.isArray(s)&&s instanceof I&&s.getParent().getBinding("rows")&&s.getParent().getBinding("rows").getModel()instanceof f||Array.isArray(s)&&s[0]instanceof I&&s[0].getParent().getBinding("rows")&&s[0].getParent().getBinding("rows").getModel()instanceof f){if(Array.isArray(s)&&d.isGroupedTargetControls){throw new SyntaxError}g=true;c=e=>{M(e.targetControlOrControls);const t=b(e.targetControlOrControls);const n=t[0].getParent();const a=n.getBinding("rows");const s=a.getPath();const r=a.getModel().getProperty(s);const o=n.getRows();if(r.length===0||o.length===0){return true}const l=t.map(e=>e.getId());const d=[];n.getColumns().filter(e=>e.getVisible()).forEach((e,t)=>{if(l.includes(e.getId())){d.push(t)}});if(d.length===0){return true}const g=o[0].getCells().filter((e,t)=>d.includes(t));const c=g.map(e=>this._resolveBindingPropertyName(e));if(c.includes(undefined)){return true}const u=g.map(e=>this._getLabelText(e));const f=Array.isArray(e.targetControlOrControls);let h=true;if(e.isGroupedTargetControls){const n=[];const a=[];for(let e=0,t=r.length;e<t;e++){n.push(r[e][g[0].getBindingPath(c[0])]);a.push(e)}if(!i(n)){h=false;this._addMessageAndInvalidTableRowCol(t,s,a,e.messageTextOrMessageTexts,u,e.validateFunctionId)}}else{for(let n=0,a=r.length;n<a;n++){let a;if(f){a=g.map((e,t)=>r[n][e.getBindingPath(c[t])])}else{a=r[n][g[0].getBindingPath(c[0])]}if(i(a)){continue}h=false;this._addMessageAndInvalidTableRowCol(t,s,[n],e.messageTextOrMessageTexts,u,e.validateFunctionId)}}return h}}else{c=e=>{const t=e.targetControlOrControls;if(i(t)){return true}const n=e.messageTextOrMessageTexts;const a=e.validateFunctionId;if(Array.isArray(t)){if(e.isGroupedTargetControls){const e=Array.isArray(n)?n[0]:n;this._addMessage(t,e,a);for(let n=0;n<t.length;n++){this._setValueState(t[n],E.Error,e)}return false}for(let e=0;e<t.length;e++){const i=Array.isArray(n)?n[e]:n;this._addMessage(t[e],i,a);this._setValueState(t[e],E.Error,i)}}else{this._addMessage(t,n,a);this._setValueState(t,E.Error,n)}return false}}const u=r.getId();if(this._mRegisteredValidator.has(u)){const e=this._mRegisteredValidator.get(u);const r=e.find(e=>t&&e.isOriginalFunctionIdUndefined&&a===e.messageTextOrMessageTexts||!t&&!e.isOriginalFunctionIdUndefined&&e.validateFunctionId===n);if(r){r.testFunction=i;r.messageTextOrMessageTexts=a;r.targetControlOrControls=s;r.validateFunction=c;r.isGroupedTargetControls=d.isGroupedTargetControls;r.controlsMoreAttachValidator=d.controlsMoreAttachValidator;r.isOriginalFunctionIdUndefined=t;r.isAttachValidator=d.isAttachValidator}else{e.push({validateFunctionId:n,testFunction:i,messageTextOrMessageTexts:a,targetControlOrControls:s,validateFunction:c,isGroupedTargetControls:d.isGroupedTargetControls,controlsMoreAttachValidator:d.controlsMoreAttachValidator,isOriginalFunctionIdUndefined:t,isAttachValidator:d.isAttachValidator})}}else{this._mRegisteredValidator.set(u,[{validateFunctionId:n,testFunction:i,messageTextOrMessageTexts:a,targetControlOrControls:s,validateFunction:c,isGroupedTargetControls:d.isGroupedTargetControls,controlsMoreAttachValidator:d.controlsMoreAttachValidator,isOriginalFunctionIdUndefined:t,isAttachValidator:d.isAttachValidator}])}if(d.isAttachValidator&&d.isAttachFocusoutValidationImmediately){if(g){if(Array.isArray(s)){const e=s;const t=e[0].getParent();const r=e.map(e=>e.getId());const o=[];t.getColumns().filter(e=>e.getVisible()).forEach((e,t)=>{if(r.includes(e.getId())){o.push(t)}});if(o.length>0){t.getRows().forEach(e=>{const t=e.getCells().filter((e,t)=>o.includes(t));this._attachRegisteredValidator(t,i,a,n,d.isGroupedTargetControls,d.controlsMoreAttachValidator)})}}else{const e=s;const t=e.getParent();const r=t.getColumns().filter(e=>e.getVisible()).findIndex(t=>t.getId()===e.getId());if(r>0){const e=t.getRows().map(e=>e.getCells()[r]);if(d.isGroupedTargetControls){this._attachRegisteredValidator(e,i,a,n,d.isGroupedTargetControls,d.controlsMoreAttachValidator)}else{e.forEach(e=>{this._attachRegisteredValidator(e,i,a,n,d.isGroupedTargetControls,d.controlsMoreAttachValidator)})}}}}else{this._attachRegisteredValidator(s,i,a,n,d.isGroupedTargetControls,d.controlsMoreAttachValidator)}}return this},registerRequiredValidator:function e(n,i,a,s,r){if(typeof n==="string"){return this._registerRequiredValidator(n,i,a,s,r)}return this._registerRequiredValidator(t(),n,i,a,s)},_registerRequiredValidator:function e(t,n,i,a,s){const r={isAttachFocusoutValidationImmediately:false,isGroupedTargetControls:false,controlsMoreAttachValidator:null};const o=Object.assign({},r,s);let l;if(Array.isArray(i)){if(o.controlsMoreAttachValidator){throw new SyntaxError}if(o.isGroupedTargetControls){l=this._getRequiredErrorMessageTextByControl(i[0])}else{l=i.map(e=>this._getRequiredErrorMessageTextByControl(e))}}else{l=this._getRequiredErrorMessageTextByControl(i)}this.registerValidator(t,n,l,i,a,o);return this},unregisterValidator:function e(t,n){const i=n.getId();if(!this._mRegisteredValidator.has(i)){return this}const a=this._mRegisteredValidator.get(i);const s=a.findIndex(e=>e.validateFunctionId===t);if(s>=0){a.splice(s,1)}if(a.length===0){this._mRegisteredValidator.delete(i)}return this},_attachValidator:function e(t){if(!(t instanceof o||t instanceof h||t instanceof _||t instanceof a)){return}if(t instanceof o&&d.isRequired(t)){this._attachNotRegisteredValidator(t)}if(this._mRegisteredValidator.has(t.getId())){this._mRegisteredValidator.get(t.getId()).forEach(e=>{if(e.isAttachValidator){if(t instanceof C&&t.getBinding("rows")&&t.getBinding("rows").getModel()instanceof f){const n=t;if(Array.isArray(e.targetControlOrControls)){const t=e.targetControlOrControls;const i=t.map(e=>e.getId());const a=[];n.getColumns().filter(e=>e.getVisible()).forEach((e,t)=>{if(i.includes(e.getId())){a.push(t)}});if(a.length>0){n.getRows().forEach(t=>{const n=t.getCells().filter((e,t)=>a.includes(t));this._attachRegisteredValidator(n,e.testFunction,e.messageTextOrMessageTexts,e.validateFunctionId,e.isGroupedTargetControls,e.controlsMoreAttachValidator)})}}else{const t=e.targetControlOrControls;const i=n.getColumns().filter(e=>e.getVisible()).findIndex(e=>e.getId()===t.getId());if(i>0){const t=n.getRows().map(e=>e.getCells()[i]);if(e.isGroupedTargetControls){this._attachRegisteredValidator(t,e.testFunction,e.messageTextOrMessageTexts,e.validateFunctionId,e.isGroupedTargetControls,e.controlsMoreAttachValidator)}else{t.forEach(t=>{this._attachRegisteredValidator(t,e.testFunction,e.messageTextOrMessageTexts,e.validateFunctionId,e.isGroupedTargetControls,e.controlsMoreAttachValidator)})}}}}else{this._attachRegisteredValidator(e.targetControlOrControls,e.testFunction,e.messageTextOrMessageTexts,e.validateFunctionId,e.isGroupedTargetControls,e.controlsMoreAttachValidator)}}})}if(t instanceof C){const e=t.getBinding();if(e&&e instanceof V){const n=t.getRows();for(let t=0,i=e.getLength();t<i;t++){if(n[t]){const e=n[t].getCells();if(e){for(let t=0;t<e.length;t++){this._attachValidator(e[t])}}}}}}else{for(let e=0;e<this._aTargetAggregations.length;e++){const n=t.getAggregation(this._aTargetAggregations[e]);if(!n){continue}if(Array.isArray(n)){for(let e=0;e<n.length;e++){const t=n[e];if(t instanceof o||t instanceof h||t instanceof _||t instanceof a){this._attachValidator(t)}}}else if(n instanceof o||n instanceof h||n instanceof _||n instanceof a){this._attachValidator(n)}}}},_validate:function e(t){let n=true;const i=t.getId();if(!((t instanceof o||t instanceof h||t instanceof _||t instanceof a)&&t.getVisible())){if(!this._callRegisteredValidator(t)){n=false}return n}if(t instanceof C&&t.getBinding("rows")&&t.getBinding("rows").getModel()instanceof f){n=this._validateRequiredInSapUiTableTable(t)}else if(t instanceof C){const e=t.getBinding("rows");if(e&&e instanceof V){const i=t.getRows();for(let t=0,a=e.getLength();t<a;t++){if(i[t]){const e=i[t].getCells();if(e){for(let t=0;t<e.length;t++){if(!this._validate(e[t])){n=false}}}}}}}else{if(t instanceof o&&("getEnabled"in t&&typeof t.getEnabled==="function"&&t.getEnabled()||!("getEnabled"in t))&&d.isRequired(t)){n=this._validateRequired(t)}for(let e=0;e<this._aTargetAggregations.length;e++){const i=t.getAggregation(this._aTargetAggregations[e]);if(!i){continue}if(Array.isArray(i)){for(let e=0;e<i.length;e++){const t=i[e];if(t instanceof o||t instanceof h||t instanceof _||t instanceof a){if(!this._validate(t)){n=false}}}}else if(i instanceof o||i instanceof h||i instanceof _||i instanceof a){if(!this._validate(i)){n=false}}}}if(!this._callRegisteredValidator(t)){n=false}return n},_toVisibledColumnIndex:function e(t,n){const i=t.getColumns();const a=e=>{let t=0;for(let n=0,a=Math.min(i.length,e+1);n<a;n++){if(!i[n].getVisible()){t++}}return e-t};let s=n;let r=true;if(!Array.isArray(s)){r=false;s=[s]}const o=[];for(let e=0,t=s.length;e<t;e++){o.push(a(s[e]))}return o},_renewValueStateInTable:function e(t){const n=t.getSource();if(!(n instanceof C)){return}const i=this._mInvalidTableRowCols.get(n.getId());if(!i){return}const a=Array.from(new Set(i.map(e=>e.columnId)));let s=[];for(let e=0,t=a.length;e<t;e++){const t=m.get(a[e]);if(!t||!(t instanceof I)||!t.getVisible()){continue}s.push(n.indexOfColumn(t))}s=this._toVisibledColumnIndex(n,s);const r=n.getRows();for(let e=0,t=s.length;e<t;e++){for(let t=0,n=r.length;t<n;t++){this._setValueState(r[t].getCells()[s[e]],E.None,null)}}if(!("model"in n.getBindingInfo("rows"))){return}const o=n.getBindingInfo("rows").model;for(let e=0,t=i.length;e<t;e++){const t=m.get(i[e].columnId);if(!t||!(t instanceof I)||!t.getVisible()){continue}const a=this._toVisibledColumnIndex(n,n.indexOfColumn(t))[0];const s=n.getRows().find(t=>t.getCells()[a].getBindingContext(o).getPath()===i[e].rowPath);if(s){const t=s.getCells()[a];this._setValueState(t,E.Error,i[e].message)}}},_clearInValidRowColsInTable:function e(t){const n=t.getSource();if(!("getId"in n)||typeof n.getId!=="function"){return}const i=n.getId();if(this._mInvalidTableRowCols.has(i)){this._mInvalidTableRowCols.delete(i)}},_addMessageAndInvalidTableRowCol:function e(t,n,i,a,s,r){let o=false;const l=b(a);t.forEach((e,t)=>{const a=e.getParent().getId();const s=e.getId();let d=this._mInvalidTableRowCols.get(a);if(!d){d=[];this._mInvalidTableRowCols.set(a,d)}i.forEach(e=>{if(!d.some(t=>t.rowIndex===e&&t.columnId===s&&t.validateFunctionId===r)){d.push({rowPath:`${n}/${e}`,rowIndex:e,columnId:s,message:l[t],validateFunctionId:r})}else if(t===0){o=true}})});if(!o){this._addMessageByColumn(t[0],l[0],r,`${n}/${i[0]}`,s.join(", "))}},_attachTableRowsUpdater:function e(t){if(this._sTableIdAttachedRowsUpdated.has(t.getId())){return}if(!this._fnDebouncedRenewValueStateInTable){this._fnDebouncedRenewValueStateInTable=R(this,this._renewValueStateInTable,100)}t.attachRowsUpdated(this._fnDebouncedRenewValueStateInTable,this);t.attachSort(this._clearInValidRowColsInTable,this);t.attachFilter(this._clearInValidRowColsInTable,this);t.attachModelContextChange(this._clearInValidRowColsInTable,this);this._sTableIdAttachedRowsUpdated.add(t.getId())},_callRegisteredValidator:function e(t){let n=true;const i=t.getId();let a=false;if(this._mRegisteredValidator.has(i)){this._mRegisteredValidator.get(i).forEach(e=>{if(!e.validateFunction(e)){n=false;if(t instanceof C){a=true}}})}if(a){this._attachTableRowsUpdater(t)}return n},_attachNotRegisteredValidator:function e(t){if(!("attachSelectionFinish"in t)&&!("attachChange"in t)&&!("attachSelect"in t)){return}const n=t.getId();if(this._isAttachedValidator(n,"")){return}const i=this._getRequiredErrorMessageTextByControl(t);this._internalAttachValidator(t,"",i)},_attachRegisteredValidator:function e(t,n,i,a,s,r){let o;if(!Array.isArray(t)){o=[t]}else if(t.length===0){return}else{o=t}for(let e=0;e<o.length;e++){const t=o[e];const l=t.getId();if(this._isAttachedValidator(l,a)){continue}let d;if(s){d=Array.isArray(i)?i[0]:i}else{d=Array.isArray(i)?i[e]:i}const g={targetControl:t,messageText:d,test:n,controls:o,validateFunctionId:a,isGroupedTargetControls:s,messageTextOrMessageTexts:i};this._internalAttachValidator(t,a,g);if(r&&e===0){let e;if(!Array.isArray(r)){e=[r]}else{e=r}for(let t=0;t<e.length;t++){const n=e[t];const i=n.getId();if(this._isAttachedValidator(i,a)){continue}this._internalAttachValidator(n,a,g)}}}},_isAttachedValidator:function e(t,n){const i=this._mControlIdAttachedValidator.get(t);if(!i){return false}return i.includes(n)},_internalAttachValidator:function e(t,n,i){const a=t.getId();const s=()=>{const e=this._mControlIdAttachedValidator.get(a);if(e){e.push(n)}else{this._mControlIdAttachedValidator.set(a,[n])}};const r=e=>{if("attachSelectionFinish"in t&&typeof t.attachSelectionFinish==="function"){t.attachSelectionFinish(i,e,this);s()}else if("attachChange"in t&&typeof t.attachChange==="function"){t.attachChange(i,e,this);s()}else if("attachSelect"in t&&typeof t.attachSelect==="function"){t.attachSelect(i,e,this);s()}};if(n===""){r(this._notRegisteredValidator)}else{r(this._registeredvalidator)}},_detachAllValidators:function e(t){const n=t.getId();const i=this._mControlIdAttachedValidator.get(n);if(!i){return}const a=e=>{if("detachSelectionFinish"in t&&typeof t.detachSelectionFinish==="function"){t.detachSelectionFinish(e,this)}else if("detachChange"in t&&typeof t.detachChange==="function"){t.detachChange(e,this)}else if("detachSelect"in t&&typeof t.detachSelect==="function"){t.detachSelect(e,this)}};i.forEach(e=>{if(e===""){a(this._notRegisteredValidator)}else{a(this._registeredvalidator)}});this._mControlIdAttachedValidator.set(n,[])},_notRegisteredValidator:function e(t,n){const i=t.getSource();if(!(i instanceof o)){return}if(this._isNullValue(i)){if(this._isCellInSapUiTableTableBindedJsonModel(i)){this._setErrorCellInSapUiTableTable(i,n,"",false)}else{this._addMessage(i,n)}this._setValueState(i,E.Error,n)}else{if(this._isCellInSapUiTableTableBindedJsonModel(i)){this._clearErrorCellInSapUiTableTable(i,"",false)}else{this._removeMessageAndValueState(i,"")}}},_registeredvalidator:function e(t,n){const i=n.targetControl;const a=n.controls.length>1?n.controls:n.controls[0];let s;if(this._isCellInSapUiTableTableBindedJsonModel(i)&&n.isGroupedTargetControls){const e=i.getParent().getParent();const t=e.getBinding("rows");const a=t.getPath();const r=t.getModel().getProperty(a);const o=this._resolveBindingPropertyName(i);const l=[];for(let e=0;e<r.length;e++){l.push(r[e][i.getBindingPath(o)])}s=n.test(l)}else{s=n.test(a)}if(s){if(this._isCellInSapUiTableTableBindedJsonModel(i)){this._clearErrorCellInSapUiTableTable(n.controls,n.validateFunctionId,n.isGroupedTargetControls)}else{n.controls.forEach(e=>{this._removeMessageAndValueState(e,n.validateFunctionId)})}}else{if(this._isCellInSapUiTableTableBindedJsonModel(i)){this._setErrorCellInSapUiTableTable(n.controls,n.messageText,n.validateFunctionId,n.isGroupedTargetControls)}else if(n.isGroupedTargetControls){this._addMessage(n.controls,n.messageText,n.validateFunctionId);n.controls.forEach(e=>{this._setValueState(e,E.Error,n.messageText)})}else{this._addMessage(i,n.messageText,n.validateFunctionId);this._setValueState(i,E.Error,n.messageText)}}},_isCellInSapUiTableTableBindedJsonModel:function e(t){return t.getParent()&&t.getParent().getParent()instanceof C&&t.getParent().getParent().getBinding("rows")&&t.getParent().getParent().getBinding("rows").getModel()instanceof f},_setErrorCellInSapUiTableTable:function e(t,n,i,a){const s=Array.isArray(t)?t:[t];const r=s[0].getParent();if(!(r instanceof T)){return}const o=r.getParent();if(!(o instanceof C)){return}const l=s.map(e=>r.indexOfCell(e));const d=o.getColumns().filter(e=>e.getVisible()).filter((e,t)=>l.includes(t));const g=o.getBinding("rows");const c=g.getPath();const u=r.getIndex();const f=s.map(e=>this._getLabelText(e));let h=[u];if(Array.isArray(t)&&a){const e=g.getModel().getProperty(c).length;h=[];for(let t=0;t<e;t++){h.push(t)}}this._addMessageAndInvalidTableRowCol(d,c,h,n,f,i);s.forEach(e=>this._setValueState(e,E.Error,n));this._attachTableRowsUpdater(o)},_clearErrorCellInSapUiTableTable:function e(t,n,i){let a;if(!Array.isArray(t)){a=[t]}else if(i){a=[t[0]]}else{a=t}const s=a[0].getParent();const o=s.getParent();const l=o.getId();let d=this._mInvalidTableRowCols.get(l);if(!d){return}const g=a.map(e=>s.indexOfCell(e));const c=o.getColumns().filter(e=>e.getVisible()).filter((e,t)=>g.includes(t));const u=c.map(e=>e.getId());if(!("model"in o.getBindingInfo("rows"))){return}const f=o.getBindingInfo("rows").model;const h=o.getBinding("rows").getPath();const _=g.map(e=>s.getCells()[e].getBindingContext(f).getPath());if(Array.isArray(t)&&i){d=d.filter(e=>!u.includes(e.columnId)||e.validateFunctionId!==n)}else{d=d.filter(e=>!_.includes(e.rowPath)||!u.includes(e.columnId)||e.validateFunctionId!==n)}this._mInvalidTableRowCols.set(l,d);const I=sap.ui.getCore().getMessageManager();const T=I.getMessageModel();const C=w.getMetadata().getName();const V=T.getProperty("/").find(e=>r.isA(e,C)&&e.getControlId()===u[0]&&"fullTarget"in e&&(Array.isArray(t)&&i&&e.fullTarget===`${h}/0`||_.includes(e.fullTarget))&&"getValidateFunctionId"in e&&typeof e.getValidateFunctionId==="function"&&e.getValidateFunctionId()===n);if(V){I.removeMessages(V);if(Array.isArray(t)){t.forEach(e=>this._clearValueStateIfNoErrors(e,this._resolveMessageTarget(e)))}else{this._clearValueStateIfNoErrors(t,this._resolveMessageTarget(t))}}},_validateRequired:function e(t){if(!this._isNullValue(t)){return true}const n=this._getRequiredErrorMessageTextByControl(t);this._addMessage(t,n);this._setValueState(t,E.Error,n);return false},_validateRequiredInSapUiTableTable:function e(t){let n=true;const i=t.getBinding("rows");const a=i.getPath();const s=i.getModel().getProperty(a);const r=t.getRows();if(s.length>0&&r.length>0){const e=r[0].getCells().filter(e=>("getEnabled"in e&&typeof e.getEnabled==="function"&&e.getEnabled()||!("getEnabled"in e))&&d.isRequired(e));if(e.length>0){const i=e.map(e=>this._resolveBindingPropertyName(e));for(let o=0;o<s.length;o++){for(let l=0;l<e.length;l++){if(!i[l]){continue}const d=s[o][e[l].getBindingPath(i[l])];if(i[l]==="selectedIndex"&&d<0||i[l]!=="selectedIndex"&&(d===""||d===null||d===undefined)){n=false;const i=this._getRequiredErrorMessageTextByControl(e[l]);const s=r[0].indexOfCell(e[l]);const d=t.getColumns().filter(e=>e.getVisible())[s];this._addMessageAndInvalidTableRowCol([d],a,[o],i,[this._getLabelText(e[l])],"")}}}}}if(!n){this._attachTableRowsUpdater(t)}t.fireRowsUpdated();return n},_removeMessageAndValueState:function e(t,n){const i=sap.ui.getCore().getMessageManager();const a=i.getMessageModel();const s=w.getMetadata().getName();const o=t.getId();const l=a.getProperty("/").find(e=>r.isA(e,s)&&e.getValidationErrorControlIds().includes(o)&&e.getValidateFunctionId()===n);if(l){i.removeMessages(l)}this._clearValueStateIfNoErrors(t,this._resolveMessageTarget(t))},_clearValueStateIfNoErrors:function e(t,n){if(!("setValueState"in t)){return}const i=b(n);if(i.length===0){return}setTimeout(()=>{const e=sap.ui.getCore().getMessageManager().getMessageModel().getProperty("/");if(i.every(t=>e.some(e=>e.getTargets&&e.getTargets().includes(t)||e.getTarget()===t))){return}if(this._isCellInSapUiTableTableBindedJsonModel(t)){const e=t.getParent();const n=e.getParent();const i=n.getId();let a=this._mInvalidTableRowCols.get(i);if(!a){this._setValueState(t,E.None,null);return}const s=e.indexOfCell(t);const r=n.getColumns().filter(e=>e.getVisible())[s];const o=r.getId();const l=n.getBindingInfo("rows");const d="model"in l?String(l.model):undefined;const g=e.getCells()[s].getBindingContext(d).getPath();const c=a.find(e=>e.rowPath===g&&e.columnId===o);if(c){this._setValueState(t,E.Error,c.message);return}}this._setValueState(t,E.None,null)},1)},_isChildOrEqualControlId:function e(t,n){if(t.getId()===n){return true}let i=t;while(i.getParent()){if(i.getParent().getId()===n){return true}i=i.getParent()}return false},_resolveMessageTarget:function e(t){let n=[];if(Array.isArray(t)){n=t}else{n.push(t)}const i=n.map(e=>{if(e.getBinding("dateValue")){return e.getId()+"/dateValue"}if(e.getBinding("value")){return e.getId()+"/value"}if(e.getBinding("selectedKey")){return e.getId()+"/selectedKey"}if(e.getBinding("selectedKeys")){return e.getId()+"/selectedKeys"}if(e.getBinding("selected")){return e.getId()+"/selected"}if(e.getBinding("selectedIndex")){return e.getId()+"/selectedIndex"}if(e.getBinding("selectedDates")){return e.getId()+"/selectedDates"}if(e.getBinding("text")){return e.getId()+"/text"}return undefined});if(i.length>0){return i}return i[0]},_resolveBindingPropertyName:function e(t){if(t.getBinding("dateValue")){return"dateValue"}if(t.getBinding("value")){return"value"}if(t.getBinding("selectedKey")){return"selectedKey"}if(t.getBinding("selectedKeys")){return"selectedKeys"}if(t.getBinding("selected")){return"selected"}if(t.getBinding("selectedIndex")){return"selectedIndex"}if(t.getBinding("selectedDates")){return"selectedDates"}if(t.getBinding("text")){return"text"}return undefined},_isNullValue:function e(t){if(!("getValue"in t)&&!("getSelectedKey"in t)&&!("getSelectedKeys"in t)&&!("getSelected"in t)&&!("getSelectedIndex"in t)&&!("getSelectedDates"in t)){return false}if("getValue"in t||"getSelectedKey"in t||"getSelectedKeys"in t||"getSelected"in t){return!("getValue"in t&&typeof t.getValue==="function"&&t.getValue()||"getSelectedKey"in t&&typeof t.getSelectedKey==="function"&&t.getSelectedKey()||"getSelectedKeys"in t&&typeof t.getSelectedKeys==="function"&&t.getSelectedKeys().length>0||"getSelected"in t&&typeof t.getSelected==="function"&&t.getSelected())}if("getSelectedIndex"in t&&typeof t.getSelectedIndex==="function"&&t.getSelectedIndex()>=0){return false}if("getSelectedDates"in t&&typeof t.getSelectedDates==="function"){const e=t.getSelectedDates();if(e.length>0&&e[0].getStartDate()){return false}}return true},_getRequiredErrorMessageTextByControl:function e(t){const n="Required to input.";const i="Required to select.";if(t instanceof s){return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT,n)}if("getSelectedKey"in t||"getSelectedKeys"in t||"getSelected"in t||"getSelectedIndex"in t||"getSelectedDates"in t){return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_SELECT,i)}return this._getResourceText(this.RESOURCE_BUNDLE_KEY_REQUIRED_INPUT,n)},_getResourceText:function e(t,n){if(this._resourceBundle){return this._resourceBundle.getText(t)}return n},_getLabelText:function e(t){if(t instanceof n){const e=t.getParent();if(e&&e instanceof l){const t=d.getReferencingLabels(e);if(t&&t.length>0){const e=m.get(t[0]);if(e&&"getText"in e&&typeof e.getText==="function"){return e.getText()}}}}if(t.getParent){const e=t.getParent();if(e instanceof T){const n=e;const i=n.getParent();if(i instanceof C){const e=n.indexOfCell(t);if(e!==-1){const t=i.getColumns().filter(e=>e.getVisible())[e].getLabel();if(typeof t==="string"){return t}else if("getText"in t&&typeof t.getText==="function"){return t.getText()}}}return undefined}else if(e instanceof i){return S.getLabelText(t,e)}}const a=d.getReferencingLabels(t);if(a&&a.length>0){const e=m.get(a[0]);if("getText"in e&&typeof e.getText==="function"){return e.getText()}}return undefined},_addMessage:function e(t,n,i){let a;let s;if(Array.isArray(t)){a=t[0];s=t}else{a=t;s=[t]}sap.ui.getCore().getMessageManager().addMessages(new w({message:n,type:y.Error,additionalText:this._getLabelText(a),processor:new c,target:this._resolveMessageTarget(t),fullTarget:"",validationErrorControlIds:s.map(e=>e.getId()),validateFunctionId:i||""}))},_addMessageByColumn:function e(t,n,i,a,s){sap.ui.getCore().getMessageManager().addMessages(new w({message:n,type:y.Error,additionalText:s,processor:new c,target:undefined,fullTarget:a,validationErrorControlIds:[t.getId()],validateFunctionId:i||""}))},_setValueState:function e(t,n,i){if("setValueState"in t&&typeof t.setValueState==="function"){t.setValueState(n);if(n===E.Error){this._markSetValueStateError(t)}else if(n===E.None){this._unmarkSetValueStateError(t)}}if("setValueStateText"in t&&typeof t.setValueStateText==="function"){t.setValueStateText(i)}},_isSetValueStateError:function e(t){return t.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR)==="true"},_markSetValueStateError:function e(t){t.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR,"true")},_unmarkSetValueStateError:function e(t){t.data(this._CUSTOM_DATA_KEY_FOR_IS_SET_VALUE_STATE_ERROR,null)}});const w=u.extend("learnin.ui5.validator.Validator._ValidatorMessage",{constructor:function e(t){if(t&&Array.isArray(t.target)){if(!u.prototype.getTargets){const e=t.target;if(t.target.length>0){t.target=t.target[0]}else{delete t.target}u.prototype.constructor.call(this,t);this.targets=e}else{u.prototype.constructor.call(this,t)}}else{u.prototype.constructor.call(this,t)}this.validationErrorControlIds=[];if(t&&t.validationErrorControlIds&&Array.isArray(t.validationErrorControlIds)&&t.validationErrorControlIds.length>0){this.validationErrorControlIds=t.validationErrorControlIds;if("addControlId"in this&&typeof this.addControlId==="function"){this.addControlId(t.validationErrorControlIds[0])}}this.validateFunctionId="";if(t&&t.validateFunctionId){this.validateFunctionId=t.validateFunctionId}},getTargets:function e(){if(u.prototype.getTargets){return u.prototype.getTargets.call(this)}if(this.targets){return this.targets}return[]},getValidationErrorControlIds:function e(){return this.validationErrorControlIds},getValidateFunctionId:function e(){return this.validateFunctionId}});return x});
},
	"learnin/ui5/validator/manifest.json":'{"_version":"1.17.0","sap.app":{"id":"learnin.ui5.validator","type":"library","applicationVersion":{"version":"0.3.1"},"title":"UI5 Validator"},"sap.ui":{"technology":"UI5","deviceTypes":{"desktop":true,"phone":true,"tablet":true}},"sap.ui5":{"contentDensities":{"compact":true,"cozy":true},"dependencies":{"minUI5Version":"1.71.11","libs":{"sap.ui.core":{},"sap.m":{}}}}}'
});
//# sourceMappingURL=library-preload.js.map
