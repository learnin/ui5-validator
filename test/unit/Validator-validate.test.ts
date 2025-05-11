import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import Util from "./util";

const [ResourceBundle, Input, Page, Select, ControlMessageProcessor, ValueState, JSONModel, StringType, Validator] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/base/i18n/ResourceBundle",
	"sap/m/Input",
	"sap/m/Page",
	"sap/m/Select",
	"sap/ui/core/message/ControlMessageProcessor",
	"sap/ui/core/ValueState",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/type/String",
	"learnin/ui5/validator/Validator",
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
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(2);
			expect(messages[0].getMessage()).toBe("必ず入力してください。");
			expect(messages[1].getMessage()).toBe("必ず選択してください。");
		});

		it("useFocusoutValidation を指定しない場合、validate 後の入力値変更時に必須バリデーションが実行される", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			let messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");

			// 必須エラーになった後、値を入力する。
			input.setValue("a");
			input.fireChange({value: "a"});

			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);

			// 再度、未入力にする。
			input.setValue("");
			input.fireChange({value: ""});

			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
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
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("enabled=false のコントロールはバリデーションされない", async () => {
			const input = new Input({ required: true, enabled: false });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(true);
			expect(input.getValueState()).toBe(ValueState.None);
			expect(input.getValueStateText()).toBe("");
			expect(Util.getAllMessages()).toHaveLength(0);
		});

		it("editable=false のコントロールはバリデーションされる", async () => {
			const input = new Input({ required: true, editable: false });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe("Required to input.");
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe("Required to input.");
		});
	});

	describe("登録される Message のプロパティのテスト", () => {
		it("コントロールやその状態、メソッドパラメータに非依存なプロパティのテスト", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			const message = Util.getAllMessages()[0];
			expect(message.getType()).toBe("Error");
			expect(message.getMessageProcessor()).toBeInstanceOf(ControlMessageProcessor);
			expect(message.getValidationErrorControlIds()).toEqual([input.getId()]);
			expect(message.getValidateFunctionId()).toBe("");
		});

		it("Label がない場合、additionalText は undefined になる", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(Util.getAllMessages()[0].getAdditionalText()).toBe(undefined);
		});

		it("bind されていない場合、target は undefined になる", async () => {
			const input = new Input({ required: true });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input);
			
			expect(Util.getAllMessages()[0].getTarget()).toBe(undefined);
		});

		it("registerRequiredValidator で validateFunctionId を指定しない場合、Message の getValidateFunctionId は空文字にならない", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerRequiredValidator((oInput: typeof Input) => oInput.getValue() !== "", input, input);

			validator.validate(input);
			
			expect(Util.getAllMessages()[0].getValidateFunctionId()).toBeTruthy();
		});

		it("registerRequiredValidator で validateFunctionId を指定した場合、Message の getValidateFunctionId で指定したIDが返される", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			const functionId = "functionId1";
			validator.registerRequiredValidator(functionId,(oInput: typeof Input) => oInput.getValue() !== "", input, input);

			validator.validate(input);
			
			expect(Util.getAllMessages()[0].getValidateFunctionId()).toBe(functionId);
		});

		it("registerValidator で validateFunctionId を指定しない場合、Message の getValidateFunctionId は空文字にならない", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			validator.registerValidator((oInput: typeof Input) => oInput.getValue() !== "", "入力してください。", input, input);

			validator.validate(input);
			
			expect(Util.getAllMessages()[0].getValidateFunctionId()).toBeTruthy();
		});

		it("registerValidator で validateFunctionId を指定した場合、Message の getValidateFunctionId で指定したIDが返される", async () => {
			const input = new Input();
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			const functionId = "functionId1";
			validator.registerValidator(functionId,(oInput: typeof Input) => oInput.getValue() !== "", "入力してください。", input, input);

			validator.validate(input);
			
			expect(Util.getAllMessages()[0].getValidateFunctionId()).toBe(functionId);
		});
	});

	describe("UI5標準バリデーション利用（isDoConstraintsValidation=true）のテスト", () => {
		it("constraints 条件が複数の場合、指定されたすべてのUI5標準バリデーションが実行される", async () => {
			const input = new Input();
			input.setModel(new JSONModel({val: "abcd"}));
			input.bindValue({ path: "/val", type: new StringType({}, { maxLength: 3, startsWith: "x" }) });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const result = (new Validator()).validate(input, { isDoConstraintsValidation: true });
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe(`Enter a value with no more than 3 characters.. Enter a value starting with "x"..`);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0].getMessage()).toBe(`Enter a value with no more than 3 characters.. Enter a value starting with "x"..`);
		});

		it("isDoConstraintsValidation=true かつ registerValidator ありの場合、両方のバリデーションが実行され、ValueStateText は registerValidator のエラーメッセージになる", async () => {
			const input = new Input();
			input.setModel(new JSONModel({val: "abcd"}));
			input.bindValue({ path: "/val", type: new StringType({}, { maxLength: 3, startsWith: "x" }) });
			parentPage.addContent(input);
			await Util.awaitRendering();

			const validator = new Validator();
			const errorMessage = "最後の文字はzである必要があります。";
			validator.registerValidator((oInput: typeof Input) => oInput.getValue().endsWith("z"), errorMessage, input, input);

			const result = validator.validate(input, { isDoConstraintsValidation: true });
			
			expect(result).toBe(false);
			expect(input.getValueState()).toBe(ValueState.Error);
			expect(input.getValueStateText()).toBe(errorMessage);
			const messages = Util.getAllMessages();
			expect(messages).toHaveLength(2);
			expect(messages[0].getMessage()).toBe(`Enter a value with no more than 3 characters.. Enter a value starting with "x"..`);
			expect(messages[1].getMessage()).toBe(errorMessage);
		});
	});
});
