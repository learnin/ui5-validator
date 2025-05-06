import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";

const [ResourceBundle, Input, Label, Page, Select, ValueState, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/base/i18n/ResourceBundle",
	"sap/m/Input",
	"sap/m/Label",
	"sap/m/Page",
	"sap/m/Select",
	"sap/ui/core/ValueState",
	"learnin/ui5/validator/Validator-dbg",
], (...args: any[]) => resolve(args)));

describe("validate の対象コントロール非依存のテスト", () => {

	let parentPage: any;

	beforeAll(() => {
		parentPage = new Page();
		parentPage.placeAt(document.body);
	})

	afterEach(() => {
		parentPage.destroyContent();
		Util.removeAllMessages();
	})

	afterAll(() => {
		parentPage.destroy();
	})

	describe("コンストラクタパラメータのテスト", () => {
		it("resourceBundle を指定した場合、指定したエラーメッセージになる", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			const select = new Select({ required: true });
			parentPage.addContent(select);
			await Util.awaitRendering();

			const resourceBundle = await ResourceBundle.create({
				url : "test-message.properties",
				async : true
			});

			const result = (new Validator({ resourceBundle: resourceBundle })).validate(parentPage);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("必ず入力してください。");
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe("必ず選択してください。");	
		});

		it("useFocusoutValidation を指定しない場合、validate 後の入力値変更時に必須バリデーションが実行される", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");

			// 必須エラーになった後、値を入力する。
			input.setValue("a");
			input.fireChange({value: "a"});

			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");

			// 再度、未入力にする。
			input.setValue("");
			input.fireChange({value: ""});

			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
		});

		it("useFocusoutValidation = false を指定した場合、validate 後に入力値を変更してもエラーステートは変わらない", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator({ useFocusoutValidation: false })).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");

			// 必須エラーになった後、値を入力する。
			input.setValue("a");
			input.fireChange({value: "a"});

			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
		});

		describe("バリデーション対象コントロール状態のテスト", () => {
			it("非表示のコントロールはバリデーションされない", async () => {
				const input = new Input({ required: true, visible: false });
				parentPage.addContent(input);
				await Util.awaitRendering();
	
				const result = (new Validator()).validate(input);
				
				expect(result).toBe(true);
				expect(input.getValueState()).toBe(ValueState.None);
				expect(input.getValueStateText()).toBe("");
			});

			it("enabled=false のコントロールはバリデーションされない", async () => {
				const input = new Input({ required: true, enabled: false });
				parentPage.addContent(input);
				await Util.awaitRendering();
	
				const result = (new Validator()).validate(input);
				
				expect(result).toBe(true);
				expect(input.getValueState()).toBe(ValueState.None);
				expect(input.getValueStateText()).toBe("");
			});

			it("editable=false のコントロールはバリデーションされる", async () => {
				const input = new Input({ required: true, editable: false });
				parentPage.addContent(input);
				await Util.awaitRendering();
	
				const result = (new Validator()).validate(input);
				
				expect(result).toBe(false);
				expect(input.getValueState()).toBe(ValueState.Error);
				expect(input.getValueStateText()).toBe("Required to input.");
			});
		});
	});
});
