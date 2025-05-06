const [Core] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/ui/core/Core"
], (...args: any[]) => resolve(args)));

export default class Util {
	static async awaitRendering() {
		// 1.127 以降は　sap/ui/test/utils/nextUIUpdate を使う
        Core.applyChanges();
	}

	static removeAllMessages() {
		// 1.118 以降は sap/ui/core/Messaging を使う
		Core.getMessageManager().removeAllMessages();
	}
}
