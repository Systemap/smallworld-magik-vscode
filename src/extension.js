// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const keyCheck = require('./keywordCheck');
const swSessions = require('./swSessions');
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

    //button click run aliases
    let swS = new swSessions.swSessions();
    disposable[0] = vscode.commands.registerCommand(
        "swSessions.runaliases",  function(alias,aliasPath,gisPath) { swS.runaliases(alias,aliasPath,gisPath); }
    );
    
    const swgis = swS.swgis;
    // magik Symbol provider --------------------------------
    vscode.languages.registerDocumentSymbolProvider('magik', new cBrowser.codeBrowser(swgis));
    vscode.languages.registerDocumentSymbolProvider('swgis', new cBrowser.codeBrowser(swgis));

    // var CompletionProvider =  new keyCheck.keywordCheck();
    // vscode.languages.registerCompletionItemProvider('magik',CompletionProvider );

    vscode.languages.registerWorkspaceSymbolProvider( new cExplorer.codeExplorer(swgis));
    
    //  vscode.languages.registerHoverProvider('magik', new cExplorer.codeExplorer()));
    //  vscode.languages.registerDefinitionProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerReferenceProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerDocumentSymbolProvider("magik", new cExplorer.codeExplorer()));
    //  vscode.languages.registerSignatureHelpProvider("magik", new cExplorer.codeExplorer(), '(', ','));
    //  vscode.languages.registerImplementationProvider("magik", new cExplorer.codeExplorer()));

    // ---- magikAgent for code actions (compiling)
    var codeActionKind = vscode.CodeActionKind.Source;
    var magikAgent; 
    magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('magik', magikAgent, codeActionKind);
    magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerHoverProvider('magik', magikAgent);

    magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('swgis', magikAgent, codeActionKind);
    vscode.languages.registerHoverProvider('swgis', new gAliases.gisAliases(swgis));
    vscode.languages.registerCodeActionsProvider('swgis', new gAliases.gisAliases(swgis), codeActionKind);    

    disposable[1] = vscode.commands.registerTextEditorCommand( "swSessions.compileCode", 
        function(editor,edit,context) { magikAgent.compileCode(context,editor,edit); }
    );

    disposable[2] = vscode.commands.registerCommand( "swSessions.apropos",
        function(context) { magikAgent.apropos(context); }
    );

    // ---- gisAliases
    let gAl = new gAliases.gisAliases(swS.swgis);
    gAl.run(context);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {

}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
