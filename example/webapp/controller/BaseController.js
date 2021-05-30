sap.ui.define([
	"sap/m/Bar",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/Dialog",
	"sap/m/MessageBox",
	"sap/m/MessageItem",
	"sap/m/MessageView",
	"sap/m/Text",
	"sap/ui/core/MessageType",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/IconPool",
	"sap/ui/core/UIComponent",
	"sap/ui/core/ValueState"
], function (
	Bar,
	Button,
	ButtonType,
	Dialog,
	MessageBox,
	MessageItem,
	MessageView,
	Text,
	MessageType,
	Controller,
	History,
	IconPool,
	UIComponent,
	ValueState) {
	"use strict";

	return Controller.extend("learnin.ui5.validator.example.controller.BaseController", {

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @param {string} [sModelName=i18n] the resource bundl model name. default is "i18n".
		 * @returns {sap.base.i18n.ResourceBundle|Promise<sap.base.i18n.ResourceBundle>} the resourceBundle of the component
		 */
		getResourceBundle: function (sModelName = "i18n") {
			return this.getOwnerComponent().getModel(sModelName).getResourceBundle();
		},

		/**
		 * {@link #getResourceText} の引数のコールバック関数の型
		 *
		 * @callback getResourceTextCallback
		 * @param {string} text リソースバンドルから取得した文字列
		 */
		/**
		 * i18n リソースバンドルからテキストを取得する。
		 * 
		 * @example
		 * // リソースバンドルの設定が同期の場合
		 * MessageToast.show(this.getResourceText("textKey", "placeholder1", "placeholder2"));
		 * // リソースバンドルの設定が非同期の場合
		 * this.getResourceText((text) => MessageToast.show(text), "textKey", "placeholder1", "placeholder2");
		 * @public
		 * @param {string|getResourceTextCallback} vKeyOrCallback リソースバンドルの設定が同期の場合：キー文字列、非同期の場合：コールバック関数
		 * @param {string} [sFirstArgOrKey] リソースバンドルの設定が同期の場合：1つ目のプレースホルダ文字列、非同期の場合：キー文字列
		 * @param {...string} [aArgs] リソースバンドルの設定が同期の場合：2つ目以降のプレースホルダ文字列、非同期の場合：1つ目以降のプレースホルダ文字列
		 * @returns {string|void} リソースバンドルの設定が同期の場合：取得した文字列、非同期の場合：なし
		 */
		getResourceText: function (vKeyOrCallback, sFirstArgOrKey, ...aArgs) {
			const oResourceBundle = this.getResourceBundle();
			if (Object.prototype.toString.call(oResourceBundle).slice(8, -1).toLowerCase() === "promise") {
				oResourceBundle.then((oResource) => vKeyOrCallback(oResource.getText(sFirstArgOrKey, aArgs)));
			} else {
				return oResourceBundle.getText(vKeyOrCallback, [sFirstArgOrKey].concat(aArgs));
			}
		},

		/**
		 * Method for navigation to specific view
		 * @public
		 * @param {string} psTarget Parameter containing the string for the target navigation
		 * @param {mapping} pmParameters? Parameters for navigation
		 * @param {boolean} pbReplace? Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
		 */
		navTo: function (psTarget, pmParameters, pbReplace) {
			this.getRouter().navTo(psTarget, pmParameters, pbReplace);
		},

		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		onNavBack: function () {
			const sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.back();
			} else {
				const defaultRoute = this.getRouter().getRouteInfoByHash("");
				if (defaultRoute && defaultRoute.name) {
					this.getRouter().navTo(defaultRoute.name, {}, true /*no history*/);
				}
			}
		},

		/**
		 * エラーメッセージの有無を返す。
		 * 
		 * @public
		 * @returns {boolean} true: エラーメッセージがある場合 false: ない場合
		 */
		hasErrorMessages: function () {
			// https://sapui5.hana.ondemand.com/1.36.6/docs/guide/62b1481d3e084cb49dd30956d183c6a0.html に記載されている通り
			// MessageManager は Singleton であり、そのことと
			// https://github.com/SAP/openui5/blob/0f35245b74ac8eee554292500dfb68af365f1e42/src/sap.ui.core/src/sap/ui/core/message/MessageManager.js
			// の実装を合わせると、#getMessageModel で返される MessageModel も Singleton となっているので、
			// MessageModel をビューにセットしなくても、同じインスタンスを取得可能。
			// ただし、XMLビュー等から参照させる場合はモデルにセットした方が実装しやすい。
			// この BaseController としてはビューへの MessageModel のセットは前提としない（継承先のアプリ側で必要に応じてセットすればよい）。
			return sap.ui.getCore().getMessageManager().getMessageModel().getProperty("/").filter(oMessage => oMessage.getType() === MessageType.Error).length > 0;
		},

		/**
		 * {@link sap.ui.core.message.MessageManager MessageManager} からすべての technical メッセージを削除する。
		 * 
		 * @public
		 */
		removeAllTechnicalMessages: function () {
			const oMessageManager = sap.ui.getCore().getMessageManager();
			const aTechnicalMessages = oMessageManager.getMessageModel().getProperty("/").filter(oMessage => oMessage.getTechnical());
			oMessageManager.removeMessages(aTechnicalMessages);
		},

		/**
		 * バリデーションエラー時のメッセージダイアログを表示する。
		 * 
		 * @public
		 * @param {Object} [mDialogParameter] sap.m.Dialog のパラメータ
		 */
		showValidationErrorMessageDialog: function (mDialogParameter) {
			if (!this.hasErrorMessages()) {
				return;
			}

			const oBackButton = new Button({
				icon: IconPool.getIconURI("nav-back"),
				press: function () {
					oMessageView.navigateBack();
					this.setVisible(false);
				}
			});

			const oDefaultDialogParam = {
				draggable: true,
				state: ValueState.Error,
				beginButton: new Button({
					text: this.getResourceBundle("i18n").getText("label.cancel"),
					press: function () {
						this.getParent().close();
					}
				}),
				customHeader: new Bar({
					contentLeft: oBackButton,
					contentMiddle: new Text({ text: this.getResourceBundle("i18n").getText("label.validationMessages") })
				}),
				contentHeight: "400px",
				contentWidth: "460px",
				verticalScrolling: false
			};
			const oDialogParam = { ...oDefaultDialogParam, ...mDialogParameter };
			const oDialog = new Dialog(oDialogParam);

			const oMessageView = new MessageView({
				showDetailsPageHeader: false,
				itemSelect: function () {
					oBackButton.setVisible(true);
				},
				listSelect: function () {
					oBackButton.setVisible(false);
				},
				activeTitlePress: oEvent => {
					const oMessage = oEvent.getParameters().item.getBindingContext().getObject();
					const oControl = sap.ui.getCore().byId(oMessage.getControlId());

					oDialog.close();
					if (oControl) {
						setTimeout(() => oControl.focus(), 300);
					}
				},
				items: {
					path: "/",
					template: new MessageItem({
						title: "{message}",
						subtitle: "{additionalText}",
						activeTitle: "{= ${controlIds}.length > 0}",
						type: "{type}",
						description: "{description}"
					})
				}
			});
			oMessageView.setModel(sap.ui.getCore().getMessageManager().getMessageModel());

			oDialog.addContent(oMessageView);
			oMessageView.navigateBack();
			oDialog.open();
		}
	});

});
