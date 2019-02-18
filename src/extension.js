'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const keyCheck = require('./keywordCheck');
const cBrowser = require('./codeBrowser');
const gAliases = require('./gisAliases');

// extension is activated 
function activate(context) {
    // ---- keywordCheck
    let kC = new keyCheck.keywordCheck();
    kC.run();
    // ---- gisAliases
    let gAl = new gAliases.swSessions();
    gAl.run(context);
    
    // magik Symbol provider --------------------------------
    var symbolProvider =  new cBrowser.codeBrowser();//{
    vscode.languages.registerDocumentSymbolProvider('magik', symbolProvider);
    vscode.languages.registerDocumentSymbolProvider('swgis', symbolProvider);

    //button click run aliases
    
    let disposable = vscode.commands.registerCommand(
        "swSessions.runaliases",
        function() {
        gAl.runaliases();
        }
      );


}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
//# sourceMappingURL=extension.js.map