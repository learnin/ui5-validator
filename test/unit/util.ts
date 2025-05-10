const [Core, Message] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/ui/core/Core",
	"sap/ui/core/message/Message",
], (...args: any[]) => resolve(args)));

export default class Util {
	static async awaitRendering(): Promise<void> {
		// 1.127 以降は　sap/ui/test/utils/nextUIUpdate を使う
        Core.applyChanges();
	}

	static removeAllMessages(): void {
		// 1.118 以降は sap/ui/core/Messaging を使う
		Core.getMessageManager().removeAllMessages();
	}

	static getAllMessages(): typeof Message[] {
		// 1.118 以降は sap/ui/core/Messaging を使う
		return Core.getMessageManager().getMessageModel().getProperty("/");
	}
}
