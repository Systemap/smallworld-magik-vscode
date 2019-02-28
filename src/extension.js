// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const keyCheck = require('./keywordCheck');
const cBrowser = require('./codeBrowser');
const gAliases = require('./gisAliases');
const cExplorer = require("./codeExplorer");
const disposable = [];

// extension is activated 
function activate(context) {
    // ---- keywordCheck
    let kC = new keyCheck.keywordCheck();
    kC.run(context);

    // vscode.languages.registerOnTypeFormattingEditProvider('magik', new keyCheck.keywordCheck());
    
    // magik Symbol provider --------------------------------
    vscode.languages.registerDocumentSymbolProvider('magik', new cBrowser.codeBrowser());
    vscode.languages.registerDocumentSymbolProvider('swgis', new cBrowser.codeBrowser());

    // var CompletionProvider =  new keyCheck.keywordCheck();
    // vscode.languages.registerCompletionItemProvider('magik',CompletionProvider );

    vscode.languages.registerWorkspaceSymbolProvider( new cExplorer.codeExplorer());
    
    //  vscode.languages.registerHoverProvider('magik', new cExplorer.codeExplorer()));
    //  vscode.languages.registerDefinitionProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerReferenceProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerDocumentSymbolProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerSignatureHelpProvider("magik", new cExplorer.codeExplorer(), '(', ','));
    //  vscode.languages.registerImplementationProvider("magik", new cExplorer.codeExplorer()));

    // ---- magikAgent for code actions (compiling)
    let swgisAgent = new gAliases.swSessions();
    let magikAgent = new cExplorer.codeExplorer(swgisAgent.swgis);
    vscode.languages.registerCodeActionsProvider('magik', magikAgent);
    disposable[0] = vscode.commands.registerTextEditorCommand(
        "swSessions.compileCode", function(editor,edit) { magikAgent.compileCode('Code',editor,edit); }
    );
    disposable[1] = vscode.commands.registerCommand(
        "swSessions.compileRange", function(editor,edit) { magikAgent.compileCode('Range',editor,edit); }
    );
    disposable[2] = vscode.commands.registerCommand(
        "swSessions.compileSelection", function(editor,edit) { magikAgent.compileCode('Selection',editor,edit); }
    );

    // ---- gisAliases
    let gAl = new gAliases.swSessions();
    gAl.run(context);
    vscode.languages.registerHoverProvider('swgis', new gAliases.swSessions());
    vscode.languages.registerCodeActionsProvider('swgis', new gAliases.swSessions());

    //button click run aliases
    disposable[3] = vscode.commands.registerCommand(
        "swSessions.runaliases", function() {gAl.runaliases();}
        );
    
};
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {

}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
