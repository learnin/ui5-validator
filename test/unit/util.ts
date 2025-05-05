const [Core] = await new Promise<any>((resolve) => sap.ui.require([
	"sap/ui/core/Core"
], (...args: any[]) => resolve(args)));

export default class Util {
	static async awaitRendering() {
		// 1.127 以降は　sap/ui/test/utils/nextUIUpdate を使う
        Core.applyChanges();
	}
}
