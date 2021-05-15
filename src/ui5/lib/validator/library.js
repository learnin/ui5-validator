/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library ui5.lib.validator
 */
 sap.ui.define([
    'sap/ui/core/library'
], () => {
    "use strict";

    /**
     * The UI5 Validator.
     *
     * @namespace
     * @name ui5.lib.validator
     * @author 
     * @version ${version}
     * @public
     */
    return sap.ui.getCore().initLibrary({
        name: "ui5.lib.validator",
        version: "${version}",
        dependencies: [
            "sap.ui.core",
            "sap.m"
        ],
        types: [],
        interfaces: [],
        controls: [
            "ui5.lib.validator.Validator"
        ],
        elements: [],
        noLibraryCSS: true
    });
});
