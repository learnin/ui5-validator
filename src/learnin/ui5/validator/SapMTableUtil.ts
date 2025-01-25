import ColumnListItem from "sap/m/ColumnListItem";
import Table from "sap/m/Table";
import Control from "sap/ui/core/Control";

export default class SapMTableUtil {

    /**
	 * oControl のラベルテキストを返す。
	 * 
	 * @param oControl - コントロール
     * @param oColumnListItem - oControl の親
	 * @returns ラベルテキスト。ラベルが見つからない場合は undefined
	 */
	static getLabelText(oControl: Control, oColumnListItem: ColumnListItem): string | undefined {
        const oTable = oColumnListItem.getParent();
        if (oTable instanceof Table) {
            const iColumnIndex = oColumnListItem.indexOfCell(oControl);
            if (iColumnIndex !== -1) {
                // oRow.indexOfCell では visible=false のカラムはスキップされているのでインデックス値を合わせるためフィルタする
                const oColumnHeader = oTable.getColumns().filter(col => col.getVisible())[iColumnIndex].getHeader();
                if ("getText" in oColumnHeader && typeof oColumnHeader.getText === "function") {
                    return oColumnHeader.getText();
                }
            }
        }
        return undefined;
    }
}