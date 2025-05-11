import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";

const [Select, Label, Page, ValueState, JSONModel, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/Select",
	"sap/m/Label",
	"sap/m/Page",
	"sap/ui/core/ValueState",
	"sap/ui/model/json/JSONModel",
	"learnin/ui5/validator/Validator",
], (...args: any[]) => resolve(args)));

describe("sap.m.Select に対する validate のテスト", () => {

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
		it("bind されていない required な Select が未選択の場合、バリデーションエラーになる", async () => {
			const select = new Select({ required: true });
			parentPage.addContent(select);
			await Util.awaitRendering();

			const result = (new Validator()).validate(select);
			
			expect(result).toBe(false);
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe("Required to select.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
			expect(messages[0].fullTarget).toBe("");
		});

		it("bind されている required な Select が未選択の場合、バリデーションエラーになる", async () => {
			const select = new Select({ required: true, selectedKey: { path: "/key" }});
			select.setModel(new JSONModel({ key: "" }));
			parentPage.addContent(select);
			await Util.awaitRendering();

			const result = (new Validator()).validate(select);
			
			expect(result).toBe(false);
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe("Required to select.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
			expect(messages[0].getTarget()).toBe(`${select.getId()}/selectedKey`);
			expect(messages[0].fullTarget).toBe("");
		});

		it("required な Select が選択されている場合、バリデーションエラーにならない", async () => {
			const select = new Select({ required: true });
			parentPage.addContent(select);
			await Util.awaitRendering();
			select.setSelectedKey("1");

			const result = (new Validator()).validate(select);
			
			expect(result).toBe(true);
			expect(select.getValueState()).toBe(ValueState.None);
			expect(select.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("required な Label で labelFor 参照されている Select が未選択の場合、バリデーションエラーになる", async () => {
			const labelText = "Label for select1";
			const label = new Label({ text: labelText, labelFor: "select1", required: true });
			const select = new Select({ id: "select1" });
			parentPage.addContent(label);
			parentPage.addContent(select);
			await Util.awaitRendering();

			const result = (new Validator()).validate(select);
			
			expect(result).toBe(false);
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe("Required to select.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
			expect(messages[0].getAdditionalText()).toBe(labelText);
		});

		it("required でない Select が未選択の場合、バリデーションエラーにならない", async () => {
			const select = new Select();
			parentPage.addContent(select);
			await Util.awaitRendering();

			const result = (new Validator()).validate(select);
			
			expect(result).toBe(true);
			expect(select.getValueState()).toBe(ValueState.None);
			expect(select.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerRequiredValidator ありの場合", () => {
		it("registerRequiredValidator 対象の required でない Select が未選択の場合、バリデーションエラーになる", async () => {
			const select = new Select();
			parentPage.addContent(select);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerRequiredValidator((oSelect: typeof Select) => oSelect.getSelectedKey() !== "", select, select);

			const result = validator.validate(select);

			expect(result).toBe(false);
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe("Required to select.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to select.");
		});

		it("registerRequiredValidator 対象の required でない Select が選択されている場合、バリデーションエラーにならない", async () => {
			const select = new Select();
			parentPage.addContent(select);
			await Util.awaitRendering();
			select.setSelectedKey("1");

			const validator = new Validator();
			validator.registerRequiredValidator((oSelect: typeof Select) => oSelect.getSelectedKey() !== "", select, select);

			const result = validator.validate(select);

			expect(result).toBe(true);
			expect(select.getValueState()).toBe(ValueState.None);
			expect(select.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerValidator ありの場合", () => {
		it("registerValidator 対象の Select に不正な値が選択されている場合、バリデーションエラーになる", async () => {
			const select = new Select();
			parentPage.addContent(select);
			await Util.awaitRendering();
			select.setSelectedKey("invalid");

			const validator = new Validator();
			const errorMessage = "有効な値を選択してください。";
			validator.registerValidator((oSelect: typeof Select) => oSelect.getSelectedKey() === "valid", errorMessage, select, select);

			const result = validator.validate(select);

			expect(result).toBe(false);
			expect(select.getValueState()).toBe(ValueState.Error);
			expect(select.getValueStateText()).toBe(errorMessage);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe(errorMessage);
		});

		it("registerValidator 対象の Select に適切な値が選択されている場合、バリデーションエラーにならない", async () => {
			const select = new Select();
			parentPage.addContent(select);
			await Util.awaitRendering();
			select.setSelectedKey("valid");

			const validator = new Validator();
			const errorMessage = "有効な値を選択してください。";
			validator.registerValidator((oSelect: typeof Select) => oSelect.getSelectedKey() === "valid", errorMessage, select, select);

			const result = validator.validate(select);

			expect(result).toBe(true);
			expect(select.getValueState()).toBe(ValueState.None);
			expect(select.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});
}); 