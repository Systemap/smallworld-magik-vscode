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
    const kC = new keyCheck.keywordCheck();
    kC.run(context);

    // vscode.languages.registerOnTypeFormattingEditProvider('magik', new keyCheck.keywordCheck());

    const swS = new swSessions.swSessions();
    const swgis = swS.swgis;
    // magik Symbol provider --------------------------------
    vscode.languages.registerDocumentSymbolProvider('magik', new cBrowser.codeBrowser(swgis));
    vscode.languages.registerDocumentSymbolProvider('swgis', new cBrowser.codeBrowser(swgis));

	vscode.languages.registerDefinitionProvider( 'magik', new cExplorer.codeExplorer(swgis));
	vscode.languages.registerDefinitionProvider( 'swgis', new cExplorer.codeExplorer(swgis));

    // var CompletionProvider =  new keyCheck.keywordCheck();
    // vscode.languages.registerCompletionItemProvider('magik',CompletionProvider );

    const cE =  new cExplorer.codeExplorer(swgis);
	vscode.languages.registerWorkspaceSymbolProvider(cE);
	cE.run(context);
    
     vscode.languages.registerReferenceProvider("magik", new cExplorer.codeExplorer(swgis));
     vscode.languages.registerReferenceProvider("swgis", new cExplorer.codeExplorer(swgis));
    //  vscode.languages.registerSignatureHelpProvider("magik", new cExplorer.codeExplorer(), '(', ','));
    //  vscode.languages.registerImplementationProvider("magik", new cExplorer.codeExplorer()));

    // ---- magikAgent for code actions (compiling)
    var codeActionKind = vscode.CodeActionKind.Source;
    const magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('magik', magikAgent, codeActionKind);
    vscode.languages.registerHoverProvider('magik', magikAgent);

    const swgisAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('swgis', swgisAgent, codeActionKind);
    vscode.languages.registerHoverProvider('swgis', swgisAgent);

	const vscCmd =  vscode.commands;
 	["Code","Range","Selection","Line"].forEach(function(cmd,idx,set){
		disposable.push( vscCmd.registerTextEditorCommand( "swSessions.compile"+cmd , function(edt,chg,cmd,rng) { magikAgent.compileCode(cmd,rng,edt,chg) }) );
	});

	disposable.push( vscCmd.registerTextEditorCommand( "swSessions.apropos",  function(edt,chg,cmd) { magikAgent.aproposCode(cmd,edt,chg) }) );

    // ---- gisAliases
    const gisA = new gAliases.gisAliases(swS.swgis);
    gisA.run(context,disposable);
    swS.run(context,disposable);
    disposable.push( vscCmd.registerCommand( "swSessions.gisCommand",  function(gisCmd) { swS.gisCommand(gisCmd) }) );
    disposable.push( vscCmd.registerCommand( "swSessions.clearWorkspaceCache",  function(cacheId) { swS.clearWorkspaceCache(cacheId) }) );
    disposable.push( vscCmd.registerCommand( "swSessions.dumpWorkspaceCache",  function(fname) { swS.dumpWorkspaceCache(fname) }) );

}
exports.activate = activate;

function deactivate() {
	disposable.forEach(element => { 
		element.dispose();
	});
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
