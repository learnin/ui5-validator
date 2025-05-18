import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";

const [DatePicker, Label, Page, ValueState, JSONModel, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/DatePicker",
	"sap/m/Label",
	"sap/m/Page",
	"sap/ui/core/ValueState",
	"sap/ui/model/json/JSONModel",
	"learnin/ui5/validator/Validator",
], (...args: any[]) => resolve(args)));

describe("sap.m.DatePicker に対する validate のテスト", () => {

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
		it("bind されていない required な DatePicker が未入力の場合、バリデーションエラーになる", async () => {
			const datePicker = new DatePicker({ required: true });
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].fullTarget).toBe("");
		});

		it("value が bind されている required な DatePicker が未入力の場合、バリデーションエラーになる", async () => {
			const datePicker = new DatePicker({ required: true, value: { path: "/date" }});
			datePicker.setModel(new JSONModel({ date: "" }));
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].getTarget()).toBe(`${datePicker.getId()}/value`);
			expect(messages[0].fullTarget).toBe("");
		});

		it("dateValue が bind されている required な DatePicker が未入力の場合、バリデーションエラーになる", async () => {
			const datePicker = new DatePicker({ required: true, dateValue: { path: "/date" }});
			datePicker.setModel(new JSONModel({ date: null }));
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].getTarget()).toBe(`${datePicker.getId()}/dateValue`);
			expect(messages[0].fullTarget).toBe("");
		});

		it("required な DatePicker が入力されている場合、バリデーションエラーにならない", async () => {
			const datePicker = new DatePicker({ required: true });
			parentPage.addContent(datePicker);
			await Util.awaitRendering();
			datePicker.setValue("2024-03-20");

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(true);
			expect(datePicker.getValueState()).toBe(ValueState.None);
			expect(datePicker.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("required な Label で labelFor 参照されている DatePicker が未入力の場合、バリデーションエラーになる", async () => {
			const labelText = "Label for datepicker1";
			const label = new Label({ text: labelText, labelFor: "datepicker1", required: true });
			const datePicker = new DatePicker({ id: "datepicker1" });
			parentPage.addContent(label);
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
			expect(messages[0].getAdditionalText()).toBe(labelText);
		});

		it("required でない DatePicker が未入力の場合、バリデーションエラーにならない", async () => {
			const datePicker = new DatePicker();
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const result = (new Validator()).validate(datePicker);
			
			expect(result).toBe(true);
			expect(datePicker.getValueState()).toBe(ValueState.None);
			expect(datePicker.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerRequiredValidator ありの場合", () => {
		it("registerRequiredValidator 対象の required でない DatePicker が未入力の場合、バリデーションエラーになる", async () => {
			const datePicker = new DatePicker();
			parentPage.addContent(datePicker);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerRequiredValidator((oDatePicker: typeof DatePicker) => oDatePicker.getValue() !== "", datePicker, datePicker);

			const result = validator.validate(datePicker);

			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
		});

		it("registerRequiredValidator 対象の required でない DatePicker が入力されている場合、バリデーションエラーにならない", async () => {
			const datePicker = new DatePicker();
			parentPage.addContent(datePicker);
			await Util.awaitRendering();
			datePicker.setValue("2024-03-20");

			const validator = new Validator();
			validator.registerRequiredValidator((oDatePicker: typeof DatePicker) => oDatePicker.getValue() !== "", datePicker, datePicker);

			const result = validator.validate(datePicker);

			expect(result).toBe(true);
			expect(datePicker.getValueState()).toBe(ValueState.None);
			expect(datePicker.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});

	describe("registerValidator ありの場合", () => {
		it("registerValidator 対象の DatePicker に不正な値が入力されている場合、バリデーションエラーになる", async () => {
			const datePicker = new DatePicker();
			parentPage.addContent(datePicker);
			await Util.awaitRendering();
			datePicker.setValue("2024-13-45"); // 不正な日付

			const validator = new Validator();
			const errorMessage = "有効な日付を入力してください。";
			validator.registerValidator((oDatePicker: typeof DatePicker) => {
				const value = oDatePicker.getValue();
				return value && !isNaN(Date.parse(value));
			}, errorMessage, datePicker, datePicker);

			const result = validator.validate(datePicker);

			expect(result).toBe(false);
			expect(datePicker.getValueState()).toBe(ValueState.Error);
			expect(datePicker.getValueStateText()).toBe(errorMessage);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe(errorMessage);
		});

		it("registerValidator 対象の DatePicker に適切な値が入力されている場合、バリデーションエラーにならない", async () => {
			const datePicker = new DatePicker();
			parentPage.addContent(datePicker);
			await Util.awaitRendering();
			datePicker.setValue("2024-03-20");

			const validator = new Validator();
			const errorMessage = "有効な日付を入力してください。";
			validator.registerValidator((oDatePicker: typeof DatePicker) => {
				const value = oDatePicker.getValue();
				return value && !isNaN(Date.parse(value));
			}, errorMessage, datePicker, datePicker);

			const result = validator.validate(datePicker);

			expect(result).toBe(true);
			expect(datePicker.getValueState()).toBe(ValueState.None);
			expect(datePicker.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});
	});
}); 