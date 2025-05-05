import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Util from "./util";

const [Input, Label, ValueState, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/Input",
	"sap/m/Label",
	"sap/ui/core/ValueState",
	"learnin/ui5/validator/Validator",
], (...args: any[]) => resolve(args)));

describe("sap.m.Input に対する validate のテスト", () => {
	it("required な Input が未入力の場合、バリデーションエラーになる", async () => {
		const input = new Input({ required: true });
		input.placeAt(document.body);
		await Util.awaitRendering();

		const result = (new Validator()).validate(input);
		
		expect(result).toBe(false);
		expect(input.getValueState()).toBe(ValueState.Error);
		expect(input.getValueStateText()).toBe("Required to input.");

		input.destroy();
	});

	it("required な Input が入力されている場合、バリデーションエラーにならない", async () => {
		const input = new Input({ required: true });
		input.placeAt(document.body);
		await Util.awaitRendering();
		input.setValue("テスト値");

		const result = (new Validator()).validate(input);
		
		expect(result).toBe(true);
		expect(input.getValueState()).toBe(ValueState.None);
		expect(input.getValueStateText()).toBe("");

		input.destroy();
	});

	it("required な Label で labelFor 参照されている Input が未入力の場合、バリデーションエラーになる", async () => {
		const label = new Label({ text: "Label for input1", labelFor: "input1", required: true });
		const input = new Input({ id: "input1" });
		label.placeAt(document.body);
		input.placeAt(document.body);
		await Util.awaitRendering();

		const result = (new Validator()).validate(input);
		
		expect(result).toBe(false);
		expect(input.getValueState()).toBe(ValueState.Error);
		expect(input.getValueStateText()).toBe("Required to input.");

		input.destroy();
		label.destroy();
	});

	it("required でない Input が未入力の場合、バリデーションエラーにならない", async () => {
		const input = new Input();
		input.placeAt(document.body);
		await Util.awaitRendering();

		const result = (new Validator()).validate(input);
		
		expect(result).toBe(true);
		expect(input.getValueState()).toBe(ValueState.None);
		expect(input.getValueStateText()).toBe("");

		input.destroy();
	});

});
