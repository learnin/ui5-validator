import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";
import ControlMessageProcessor from "sap/ui/core/message/ControlMessageProcessor";

const [Input, Label, Page, ValueState, JSONModel, StringType, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/Input",
	"sap/m/Label",
	"sap/m/Page",
	"sap/ui/core/ValueState",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/type/String",
	"learnin/ui5/validator/Validator",
], (...args: any[]) => resolve(args)));

describe("sap.m.Input に対する validate のテスト", () => {

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
		it("bind されていない required な Input が未入力の場合、バリデーションエラーになる", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].fullTarget).toBe("");
		});

		it("bind されている required な Input が未入力の場合、バリデーションエラーになる", async () => {
			const input = new Input({ required: true });
			input.setModel(new JSONModel({val: ""}));
			input.bindValue({ path: "/val" });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].getTarget()).toBe(`${input.getId()}/value`);
			expect(messages[0].fullTarget).toBe("");
		});

		it("required な Input が入力されている場合、バリデーションエラーにならない", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();
			input.setValue("a");

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(true);
			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("required な Label で labelFor 参照されている Input が未入力の場合、バリデーションエラーになる", async () => {
			const labelText = "Label for input1";
			const label = new Label({ text: labelText, labelFor: "input1", required: true });
			const input = new Input({ id: "input1" });
			parentPage.addContent(label);
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].getAdditionalText()).toBe(labelText);
		});

		it("required でない Input が未入力の場合、バリデーションエラーにならない", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(true);
			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("isDoConstraintsValidation=true の場合、UI5標準バリデーションも実行される", async () => {
			const input = new Input();
			input.setModel(new JSONModel({val: "ab"}));
			input.bindValue({ path: "/val", type: new StringType({}, { maxLength: 1 }) });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input, { isDoConstraintsValidation: true });
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Enter a value with no more than 1 characters.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Enter a value with no more than 1 characters.");
		});
	});

	describe("registerRequiredValidator ありの場合", () => {
		it("registerRequiredValidator 対象の required でない Input が未入力の場合、バリデーションエラーになる", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerRequiredValidator((oInput: typeof Input) => oInput.getValue().length > 0, input, input);

			const result = validator.validate(input);

			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
		});

		it("registerRequiredValidator 対象の required でない Input が入力されている場合、バリデーションエラーにならない", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();
			input.setValue("a");

			const validator = new Validator();
			validator.registerRequiredValidator((oInput: typeof Input) => oInput.getValue().length > 0, input, input);

			const result = validator.validate(input);

			expect(result).toBe(true);
			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerValidator ありの場合", () => {
		it("registerValidator 対象の Input に不正な値が入力されている場合、バリデーションエラーになる", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();
			input.setValue("1234");

			const validator = new Validator();
			const errorMessage = "3字以内で入力してください。";
			validator.registerValidator((oInput: typeof Input) => oInput.getValue().length <= 3, errorMessage, input, input);

			const result = validator.validate(input);

			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe(errorMessage);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe(errorMessage);
		});

		it("registerValidator 対象の Input に適切な値が入力されている場合、バリデーションエラーにならない", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();
			input.setValue("123");

			const validator = new Validator();
			const errorMessage = "3字以内で入力してください。";
			validator.registerValidator((oInput: typeof Input) => oInput.getValue().length <= 3, errorMessage, input, input);

			const result = validator.validate(input);

			expect(result).toBe(true);
			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

	});
});
