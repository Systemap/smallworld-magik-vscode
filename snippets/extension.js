// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const keyCheck = require('./keywordCheck');
const cBrowser = require('./codeBrowser');
const gAliases = require('./gisAliases');
const cExplorer = require("./codeExplorer");

// extension is activated 
function activate(context) {
    // ---- keywordCheck
    let kC = new keyCheck.keywordCheck();
    kC.run();

    // ---- gisAliases
    let gAl = new gAliases.swSessions();
    gAl.run(context);
    
    // magik Symbol provider --------------------------------
    var swDSP=  new cBrowser.codeBrowser();
    vscode.languages.registerDocumentSymbolProvider('magik', swDSP);
    vscode.languages.registerDocumentSymbolProvider('swgis', swDSP);


    //  vscode.languages.registerHoverProvider('magik', new goExtraInfo_1.GoHoverProvider()));
    //  vscode.languages.registerDefinitionProvider("magik", new goDeclaration_1.GoDefinitionProvider()));
    //  vscode.languages.registerReferenceProvider("magik", new goReferences_1.GoReferenceProvider()));
    //  vscode.languages.registerDocumentSymbolProvider("magik", new goOutline_1.GoDocumentSymbolProvider()));
    //  vscode.languages.registerSignatureHelpProvider("magik", new goSignature_1.GoSignatureHelpProvider(), '(', ','));
    //  vscode.languages.registerImplementationProvider("magik", new goImplementations_1.GoImplementationProvider()));

    // var CompletionProvider =  new keyCheck.keywordCheck();
    // vscode.languages.registerCompletionItemProvider('magik',CompletionProvider );

    // var swWSP =  new cBrowser.codeBrowser();
    var swWSP =  new cExplorer.swWorkspaceSymbolProvider();
    vscode.languages.registerWorkspaceSymbolProvider(swWSP);

    vscode.commands.registerCommand('magik.set', (args) => {
        let doc = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
        if (doc == null) return;
        vscode.languages.setTextDocumentLanguage(doc, "magik");
    });
};
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
//# sourceMappingURL=extension.js.map