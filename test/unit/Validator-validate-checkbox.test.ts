import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";

const [CheckBox, Label, Page, ValueState, JSONModel, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/CheckBox",
	"sap/m/Label",
	"sap/m/Page",
	"sap/ui/core/ValueState",
	"sap/ui/model/json/JSONModel",
	"learnin/ui5/validator/Validator",
], (...args: any[]) => resolve(args)));

describe("sap.m.CheckBox に対する validate のテスト", () => {

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

	describe("registerRequiredValidator, registerValidator なしの場合", () => {
		// required プロパティは 1.121 以降で追加されたものなので、なければテストしない。
		if ("getRequired" in (new CheckBox())) {
			it("bind されていない required な CheckBox が未選択の場合、バリデーションエラーになる", async () => {
				const checkBox = new CheckBox({ required: true, text: "選択してください" });
				parentPage.addContent(checkBox);
				await Util.awaitRendering();

				const result = (new Validator()).validate(checkBox);
				
				expect(result).toBe(false);
				expect(checkBox.getValueState()).toBe(ValueState.Error);
				const messages = Util.getAllMessages();
				expect(messages).toHaveLength(1);
				expect(messages[0].getMessage()).toBe("Required to select.");
				expect(messages[0].fullTarget).toBe("");
			});

			it("bind されている required な CheckBox が未選択の場合、バリデーションエラーになる", async () => {
				const checkBox = new CheckBox({ required: true, selected: { path: "/checked" }, text: "選択してください" });
				checkBox.setModel(new JSONModel({ checked: false }));
				parentPage.addContent(checkBox);
				await Util.awaitRendering();

				const result = (new Validator()).validate(checkBox);
				
				expect(result).toBe(false);
				expect(checkBox.getValueState()).toBe(ValueState.Error);
				const messages = Util.getAllMessages();
				expect(messages).toHaveLength(1);
				expect(messages[0].getMessage()).toBe("Required to select.");
				expect(messages[0].fullTarget).toBe("");
			});
		}

		it("required な Label で labelFor 参照されている CheckBox が未選択の場合、バリデーションエラーになる", async () => {
			const labelText = "Label for checkbox1";
			const label = new Label({ text: labelText, labelFor: "checkbox1", required: true });
			const checkBox = new CheckBox({ id: "checkbox1" });
			parentPage.addContent(label);
			parentPage.addContent(checkBox);
			await Util.awaitRendering();

			const result = (new Validator()).validate(checkBox);
			
			expect(result).toBe(false);
			expect(checkBox.getValueState()).toBe(ValueState.Error);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
			expect(messages[0].getAdditionalText()).toBe(labelText);
		});

		it("required な Label で labelFor 参照されている CheckBox が選択されている場合、バリデーションエラーにならない", async () => {
			const labelText = "Label for checkbox1";
			const label = new Label({ text: labelText, labelFor: "checkbox1", required: true });
			const checkBox = new CheckBox({ id: "checkbox1" });
			parentPage.addContent(label);
			parentPage.addContent(checkBox);
			await Util.awaitRendering();
			checkBox.setSelected(true);

			const result = (new Validator()).validate(checkBox);
			
			expect(result).toBe(true);
			expect(checkBox.getValueState()).toBe(ValueState.None);
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("required でない Label で labelFor 参照されている CheckBox が未選択の場合、バリデーションエラーにならない", async () => {
			const labelText = "Label for checkbox1";
			const label = new Label({ text: labelText, labelFor: "checkbox1" });
			const checkBox = new CheckBox({ id: "checkbox1" });
			parentPage.addContent(label);
			parentPage.addContent(checkBox);
			await Util.awaitRendering();

			const result = (new Validator()).validate(checkBox);
			
			expect(result).toBe(true);
			expect(checkBox.getValueState()).toBe(ValueState.None);
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerRequiredValidator ありの場合", () => {
		it("registerRequiredValidator 対象の required でない CheckBox が未選択の場合、バリデーションエラーになる", async () => {
			const checkBox = new CheckBox();
			parentPage.addContent(checkBox);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerRequiredValidator((oCheckBox: typeof CheckBox) => oCheckBox.getSelected(), checkBox, checkBox);

			const result = validator.validate(checkBox);

			expect(result).toBe(false);
			expect(checkBox.getValueState()).toBe(ValueState.Error);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
		});

		it("registerRequiredValidator 対象の required でない CheckBox が選択されている場合、バリデーションエラーにならない", async () => {
			const checkBox = new CheckBox();
			parentPage.addContent(checkBox);
			await Util.awaitRendering();
			checkBox.setSelected(true);

			const validator = new Validator();
			validator.registerRequiredValidator((oCheckBox: typeof CheckBox) => oCheckBox.getSelected(), checkBox, checkBox);

			const result = validator.validate(checkBox);

			expect(result).toBe(true);
			expect(checkBox.getValueState()).toBe(ValueState.None);
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerValidator ありの場合", () => {
		it("registerValidator 対象の CheckBox が未選択の場合、バリデーションエラーになる", async () => {
			const checkBox = new CheckBox();
			parentPage.addContent(checkBox);
			await Util.awaitRendering();
			checkBox.setSelected(false);

			const validator = new Validator();
			const errorMessage = "チェックが必要です。";
			validator.registerValidator((oCheckBox: typeof CheckBox) => oCheckBox.getSelected(), errorMessage, checkBox, checkBox);

			const result = validator.validate(checkBox);

			expect(result).toBe(false);
			expect(checkBox.getValueState()).toBe(ValueState.Error);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe(errorMessage);
		});

		it("registerValidator 対象の CheckBox が選択されている場合、バリデーションエラーにならない", async () => {
			const checkBox = new CheckBox();
			parentPage.addContent(checkBox);
			await Util.awaitRendering();
			checkBox.setSelected(true);

			const validator = new Validator();
			const errorMessage = "チェックが必要です。";
			validator.registerValidator((oCheckBox: typeof CheckBox) => oCheckBox.getSelected(), errorMessage, checkBox, checkBox);

			const result = validator.validate(checkBox);

			expect(result).toBe(true);
			expect(checkBox.getValueState()).toBe(ValueState.None);
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});
}); 