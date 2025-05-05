import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Util from "./util";

const [Input, Validator, ValueState] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/m/Input",
	"learnin/ui5/validator/Validator",
	"sap/ui/core/ValueState"
], (...args: any[]) => resolve(args)));

describe("sap.m.Input に対する validate のテスト", () => {
	const sut = new Validator();
	let input: typeof Input;

	beforeEach(async () => {
		input = new Input({ required: true });
		input.placeAt(document.body);
		await Util.awaitRendering();
	});

	afterEach(() => {
		input.destroy();
	});

	it("required な Input が未入力の場合、バリデーションエラーになる", () => {
		const result = sut.validate(input);
		expect(result).toBe(false);
		expect(input.getValueState()).toBe(ValueState.Error);
		expect(input.getValueStateText()).toBe("Required to input.");
	});

	it("required な Input が入力されている場合、バリデーションエラーにならない", () => {
		input.setValue("テスト値");
		const result = sut.validate(input);
		expect(result).toBe(true);
		expect(input.getValueState()).toBe(ValueState.None);
		expect(input.getValueStateText()).toBe("");
	});

	it("required でない Input が未入力の場合、バリデーションエラーにならない", () => {
		input.setRequired(false);
		const result = sut.validate(input);
		expect(result).toBe(true);
		expect(input.getValueState()).toBe(ValueState.None);
		expect(input.getValueStateText()).toBe("");
	});
});
