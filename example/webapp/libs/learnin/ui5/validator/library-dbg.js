/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library learnin.ui5.validator
 */
 sap.ui.define([
    'sap/ui/core/library'
], () => {
    "use strict";

    /**
     * The UI5 Validator.
     *
     * @namespace
     * @name learnin.ui5.validator
     * @version 0.3.6
     * @public
     */
    return sap.ui.getCore().initLibrary({
        name: "learnin.ui5.validator",
        version: "0.3.6",
        dependencies: [
            "sap.ui.core",
            "sap.m"
        ],
        types: [],
        interfaces: [],
        controls: [
            "learnin.ui5.validator.Validator"
        ],
        elements: [],
        noLibraryCSS: true
    });
});
