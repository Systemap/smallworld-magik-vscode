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

	vscode.languages.registerDefinitionProvider( 'magik', new cExplorer.codeExplorer(swgis));

    // var CompletionProvider =  new keyCheck.keywordCheck();
    // vscode.languages.registerCompletionItemProvider('magik',CompletionProvider );

    let cE =  new cExplorer.codeExplorer(swgis);
	vscode.languages.registerWorkspaceSymbolProvider(cE);
	cE.run(context);
    
     vscode.languages.registerReferenceProvider("magik", new cExplorer.codeExplorer(swgis));
    //  vscode.languages.registerSignatureHelpProvider("magik", new cExplorer.codeExplorer(), '(', ','));
    //  vscode.languages.registerImplementationProvider("magik", new cExplorer.codeExplorer()));

    // ---- magikAgent for code actions (compiling)
    var codeActionKind = vscode.CodeActionKind.Source;
    var magikAgent; 
    magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('magik', magikAgent, codeActionKind);
    vscode.languages.registerHoverProvider('magik', magikAgent);

    magikAgent = new cExplorer.codeExplorer(swgis);
    vscode.languages.registerCodeActionsProvider('swgis', magikAgent, codeActionKind);
    vscode.languages.registerHoverProvider('swgis', magikAgent);

	const vscCmd =  vscode.commands;
 	["Code","Range","Selection","Line"].forEach(function(cmd,idx,set){
		disposable.push( vscCmd.registerTextEditorCommand( "swSessions.compile"+cmd , function(edt,chg,cmd,rng) { magikAgent.compileCode(cmd,rng,edt,chg) }) );
	});

	disposable.push( vscCmd.registerTextEditorCommand( "swSessions.apropos",  function(edt,chg,cmd) { magikAgent.aproposCode(cmd,edt,chg) }) );

    // ---- gisAliases
    let gAl = new gAliases.gisAliases(swS.swgis);
    gAl.run(context);
}
exports.activate = activate;

function deactivate() {
	disposable.forEach(element => { 
		element.dispose() 
	});
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map 
