"use strict";

sap.ui.define(["sap/m/Table"], function (Table) {
  /**
   * sap.m.Table に関するユーティリティクラス
   */
  class SapMTableUtil {
    /**
    * oControl のラベルテキストを返す。
    * 
    * @param oControl - コントロール
     * @param oColumnListItem - oControl の親
    * @returns ラベルテキスト。ラベルが見つからない場合は undefined
    */
    static getLabelText(oControl, oColumnListItem) {
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
  return SapMTableUtil;
});