import Bar from "sap/m/Bar";
import Button from "sap/m/Button";
import Dialog from "sap/m/Dialog";
import MessageItem from "sap/m/MessageItem";
import MessageView from "sap/m/MessageView";
import Text from "sap/m/Text";
import { MessageType, ValueState } from "sap/ui/core/library";
import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import IconPool from "sap/ui/core/IconPool";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import { default as sapUiTableTable } from "sap/ui/table/Table";

/**
 * @namespace learnin.ui5.validator.example.controller
 */
export default class BaseController extends Controller {

	/**
	 * Convenience method for getting the view model by name in every controller of the application.
	 * @public
	 * @param {string} sName the model name
	 * @returns {sap.ui.model.Model} the model instance
	 */
	getModel(sName?: string) {
		const view = this.getView();
		return view ? view.getModel(sName) : undefined;
	}

	/**
	 * Convenience method for setting the view model in every controller of the application.
	 * @public
	 * @param {sap.ui.model.Model} oModel the model instance
	 * @param {string} sName the model name
	 * @returns {sap.ui.mvc.View} the view instance
	 */
	setModel(oModel: any, sName?: string) {
		const view = this.getView();
		if (view) {
			view.setModel(oModel, sName);
		}
		return view;
	}

	/**
	 * Convenience method for getting the resource bundle.
	 * @public
	 * @param {string} [sModelName=i18n] the resource bundl model name. default is "i18n".
	 * @returns {sap.base.i18n.ResourceBundle|Promise<sap.base.i18n.ResourceBundle>} the resourceBundle of the component
	 */
	getResourceBundle(sModelName: string = "i18n") {
		const owner = this.getOwnerComponent();
		if (!owner) {
			return undefined;
		}
		const model = owner.getModel(sModelName) as any;
		return model && typeof model.getResourceBundle === "function" ? model.getResourceBundle() : undefined;
	}

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
	getResourceText(vKeyOrCallback: string | ((text: string) => void), sFirstArgOrKey?: string, ...aArgs: string[]) {
		const oResourceBundle = this.getResourceBundle();
		if (!oResourceBundle) {
			return undefined;
		}
		if (Object.prototype.toString.call(oResourceBundle).slice(8, -1).toLowerCase() === "promise") {
			if (typeof vKeyOrCallback === "function") {
				oResourceBundle.then((oResource: any) => vKeyOrCallback(oResource.getText(sFirstArgOrKey, aArgs)));
			}
		} else {
			if (typeof vKeyOrCallback === "string") {
				return oResourceBundle.getText(vKeyOrCallback, [sFirstArgOrKey].concat(aArgs));
			}
		}
	}

	/**
	 * Method for navigation to specific view
	 * @public
	 * @param {string} psTarget Parameter containing the string for the target navigation
	 * @param {mapping} pmParameters? Parameters for navigation
	 * @param {boolean} pbReplace? Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
	 */
	navTo(psTarget: string, pmParameters?: Record<string, any>, pbReplace?: boolean) {
		this.getRouter().navTo(psTarget, pmParameters, pbReplace);
	}

	getRouter(): any {
		return UIComponent.getRouterFor(this);
	}

	onNavBack() {
		const sPreviousHash = History.getInstance().getPreviousHash();

		if (sPreviousHash !== undefined) {
			window.history.back();
		} else {
			const defaultRoute = this.getRouter().getRouteInfoByHash("");
			if (defaultRoute && defaultRoute.name) {
				this.getRouter().navTo(defaultRoute.name, {}, true /*no history*/);
			}
		}
	}

	/**
	 * エラーメッセージの有無を返す。
	 * 
	 * @public
	 * @returns {boolean} true: エラーメッセージがある場合 false: ない場合
	 */
	hasErrorMessages() {
		// https://sapui5.hana.ondemand.com/1.36.6/docs/guide/62b1481d3e084cb49dd30956d183c6a0.html に記載されている通り
		// MessageManager は Singleton であり、そのことと
		// https://github.com/SAP/openui5/blob/0f35245b74ac8eee554292500dfb68af365f1e42/src/sap.ui.core/src/sap/ui/core/message/MessageManager.js
		// の実装を合わせると、#getMessageModel で返される MessageModel も Singleton となっているので、
		// MessageModel をビューにセットしなくても、同じインスタンスを取得可能。
		// ただし、XMLビュー等から参照させる場合はモデルにセットした方が実装しやすい。
		// この BaseController としてはビューへの MessageModel のセットは前提としない（継承先のアプリ側で必要に応じてセットすればよい）。
		return sap.ui.getCore().getMessageManager().getMessageModel().getProperty("/").filter((oMessage: any) => oMessage.getType() === MessageType.Error).length > 0;
	}

	/**
	 * {@link sap.ui.core.message.MessageManager MessageManager} からすべての technical メッセージを削除する。
	 * 
	 * @public
	 */
	removeAllTechnicalMessages() {
		const oMessageManager = sap.ui.getCore().getMessageManager();
		const aTechnicalMessages = oMessageManager.getMessageModel().getProperty("/").filter((oMessage: any) => oMessage.getTechnical());
		oMessageManager.removeMessages(aTechnicalMessages);
	}

	/**
	 * バリデーションエラー時のメッセージダイアログを表示する。
	 * 
	 * @public
	 * @param {Object} [mDialogParameter] sap.m.Dialog のパラメータ
	 */
	showValidationErrorMessageDialog(mDialogParameter?: Record<string, any>) {
		if (!this.hasErrorMessages()) {
			return;
		}

		const oBackButton = new Button({
			icon: IconPool.getIconURI("nav-back"),
			press: function (this: Button) {
				oMessageView.navigateBack();
				this.setVisible(false);
			}
		});

		const oDefaultDialogParam = {
			draggable: true,
			state: ValueState.Error,
			beginButton: new Button({
				text: this.getResourceBundle("i18n").getText("label.cancel"),
				press: function (this: Button) {
					const parent = this.getParent() as Dialog | null;
					if (parent) {
						parent.close();
					}
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
		const oDialogParam = { ...oDefaultDialogParam, ...(mDialogParameter || {}) };
		const oDialog = new Dialog(oDialogParam);

		const oMessageView = new MessageView({
			showDetailsPageHeader: false,
			itemSelect: function () {
				oBackButton.setVisible(true);
			},
			listSelect: function () {
				oBackButton.setVisible(false);
			},
			activeTitlePress: async (oEvent: any) => {
				const oMessage = oEvent.getParameters().item.getBindingContext().getObject() as any;
				let oControl = sap.ui.getCore().byId(oMessage.getControlId()) as any;

				oDialog.close();
				
				if (oControl) {
					let fullTarget: string | null = null;
					if (oMessage.fullTarget) {
						if (Array.isArray(oMessage.fullTarget)) {
							if (oMessage.fullTarget.length > 0) {
								fullTarget = oMessage.fullTarget[0];
							}
						} else {
							fullTarget = oMessage.fullTarget;
						}
					}
					const oParent = oControl.getParent ? oControl.getParent() : null;
					const oRowsBinding = oParent && oParent.getBinding ? oParent.getBinding("rows") : null;
					if (fullTarget
						&& oParent instanceof sapUiTableTable
						&& oRowsBinding
						&& oRowsBinding.getModel() instanceof JSONModel) {
						// sap.ui.table.Table 配下のコントロールは画面に表示されている数だけしか存在せず、スクロール時は BindingContext が変わっていくだけなので、
						// Message.getControlId のコントロールが現在もエラーかどうかはわからない。
						// ui5-Validator でfullTargetにエラーの行インデックスがセットされているので、その行に一旦スクロールさせてその行がバインドされてるコントロールを取得して、そのコントロールにフォーカスする。
						const oColumn = oControl;
						const oTable = oParent as sapUiTableTable;
						const rowsPath = oTable.getBinding("rows")?.getPath();
						if (!rowsPath) {
							return;
						}
						const iTargetDataRowIndex = Number(fullTarget.replace(`${rowsPath}/`, ""));
						if (Number.isNaN(iTargetDataRowIndex)) {
							return;
						}
						const iColumnIndex = oTable.getColumns().filter((oCol: any) => oCol.getVisible()).findIndex((oCol: any) => oCol.getId() === oColumn.getId());
						if (iColumnIndex === -1) {
							return;
						}
						const sTableModelName = (oTable.getBindingInfo("rows") as any)?.model;

						oTable.setFirstVisibleRow(iTargetDataRowIndex);
						// このあと行うoTable.getRows()はスクロールが終わってからでないと対象の行を取得できないので、sleepさせる。
						await new Promise((resolve) => setTimeout(resolve, 100));

						const oRow = oTable.getRows().find((oRow: any) => {
							const oCell = oRow.getCells()[iColumnIndex];
							const oContext = oCell ? oCell.getBindingContext(sTableModelName) : null;
							return oContext && oContext.getPath() === fullTarget;
						});
						if (!oRow) {
							return;
						}
						oControl = oRow.getCells()[iColumnIndex];
						if (!oControl) {
							return;
						}
					}
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
}
