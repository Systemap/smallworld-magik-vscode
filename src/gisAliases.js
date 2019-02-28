// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const swSessions = require('./swSessions');


class gisAliases{
    constructor() {
        this.swgis = swgis;

    }
        
    run(context) {

        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            triggerUpdateDecorations();
        }
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                activeEditor= editor
                triggerUpdateDecorations();
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        }, null, context.subscriptions);
        var timeout = null;
        function triggerUpdateDecorations() {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(updateDecorations, 500);
        }

        function updateDecorations() {
            if (!activeEditor) 
                return;
            else if(activeEditor.document.languageId != "swgis")  
                return;
            // create a decorator type that we use to decorate labels
            const crosshairType = vscode.window.createTextEditorDecorationType({
                cursor: 'alias',
               // backgroundColor: 'rgba(255,64,0,0.3)',
                border: "1px solid rgba(255,64,0,0.3)",
                width: "1px",
                color: 'rgba(255,64,0,1)'
            });

            // const gis = '%SMALLWORLD_GIS%\\bin\\x86\\gis.exe -a '+activeEditor.document.uri.fsPath+' ';
            var regEx = /[A-Za-z_0-9-]+:(\s\n|\n)/ig; // 
            const text = activeEditor.document.getText();
            const labelLines = [];
            let match;
            while (match = regEx.exec(text)) {
                const startPos = activeEditor.document.positionAt(match.index);
                const endPos = activeEditor.document.positionAt(match.index + match[0].length);
                const decoration = { range: new vscode.Range(startPos, endPos)};//, hoverMessage: gis+match[0] };
                labelLines.push(decoration);
            };
            if(labelLines.length)   
                activeEditor.setDecorations(crosshairType, labelLines);
        }

    }
    
    provideCodeActions(document, range, context, token) {
        if ( swgis.sessions != null) return;
        if (!swgis.gisPath) return;

        var pos = range.start;
        var selectedAlias = document.lineAt(pos.line).text;
        selectedAlias = selectedAlias.split("#")[0].trim()
        if (!swgis.aliasePattern.test(selectedAlias)) return null;
            if (selectedAlias.split(" ").length>1) return null;

       var currentOpenTabFilePath = document.fileName;
        var codeActions = [];
        var titleAction = "Run GIS "+selectedAlias;
        const args = [selectedAlias.split(":")[0], currentOpenTabFilePath ];
        const cak = {value: titleAction, tooltip: titleAction};
        const runAction = new vscode.CodeAction(titleAction, cak);// vscode.CodeActionKind.Empty);
        runAction.command = {
            title:    titleAction,
            command:  "swSessions.runaliases",
            arguments: args,
            tooltip: titleAction
        };
        swgis.codeAction = runAction;
        //runAction.diagnostics = [ diagnostic ];
        codeActions.push(runAction);

        return codeActions;
    }

    provideHover(document, position, token) {
        
        var alias = document.lineAt(position.line).text;
        alias = alias.split("#")[0].trim()
        if (swgis.aliasePattern.test(alias)){
            if (!swgis.gisPath) 
                return this.errorHover();
        }
    }

    errorHover(alias) {
        if (!swgis.errorHover ) {
            let hoverTexts = new vscode.MarkdownString();
            hoverTexts.appendCodeblock("Run GIS: invalid \"swgis.gisPath\" ","magik");
            hoverTexts.appendCodeblock("Set gisPath in File-Preferences-Settings, e.g.:","magik");
            hoverTexts.appendCodeblock("{ \"swgis.gisPath\" : \"C:/Smallworld/core/bin/x86/gis.exe\" }","magik");
            swgis.errorHover = new vscode.Hover(hoverTexts);
        }
        return swgis.errorHover 
        }
    

}
exports.gisAliases = gisAliases    
